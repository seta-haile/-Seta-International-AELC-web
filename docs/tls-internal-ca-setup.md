# TLS qua CA nội bộ (AD CS) — thay cho self-signed/hosts file

Mục tiêu: web/api chạy sau HTTPS thật, dùng chứng chỉ do CA nội bộ của công ty
(AD Certificate Services) cấp, và một tên miền nội bộ thật đăng ký trong DNS
nội bộ (AD-integrated DNS) — **không** dùng chứng chỉ self-signed, không sửa
`/etc/hosts`/`C:\Windows\System32\drivers\etc\hosts`, không import cert thủ
công vào từng máy client.

Đây là bước tiếp theo sau commit `4c91315` ("Stop marking the session cookie
Secure over plain HTTP"), commit đó đã làm cho `apps/web` đọc
`x-forwarded-proto` từ reverse proxy để quyết định cờ `Secure` trên cookie —
tức là code đã sẵn sàng chạy sau TLS, chỉ còn thiếu hạ tầng.

## Vì sao không dùng self-signed + hosts

- Self-signed cert đòi hỏi trust thủ công trên **từng máy client** (import
  vào Trusted Root) — không scale, dễ quên, và dạy người dùng thói quen xấu
  "cứ bấm qua cảnh báo trình duyệt".
- Sửa hosts file trên từng máy là cấu hình cục bộ, không đồng bộ, không sống
  sót qua việc đổi IP máy chủ, và không hoạt động cho máy ngoài mạng LAN.
- Công ty đã có (hoặc dự kiến có) Active Directory — dùng đúng PKI nội bộ và
  DNS nội bộ là cách chính thống, tự động trust trên mọi máy đã join domain,
  và đúng với hướng dẫn gốc ban đầu.

## Điều kiện cần từ hạ tầng (DevOps/IT xác nhận trước khi làm)

Xem câu hỏi cụ thể ở cuối tài liệu này để gửi DevOps/IT. Tóm tắt các thành
phần cần có:

1. **AD CS (Active Directory Certificate Services)** — một CA nội bộ (Enterprise
   CA hoặc Standalone CA) đã cài đặt và root cert của nó đã được phân phối tới
   mọi máy join domain qua Group Policy (mặc định nếu là Enterprise CA).
2. **DNS nội bộ** (AD-integrated DNS hoặc zone tương đương) — có thể tạo một
   A record thật, ví dụ `aelc.corp.seta-international.vn` hoặc tên tương ứng
   domain nội bộ, trỏ tới IP của máy deploy (hiện là `192.168.8.64` theo
   `apps/api/.env.example`).
3. Quyền yêu cầu cấp chứng chỉ từ CA đó (certificate template cho web server,
   hoặc quyền `certreq`/Certificate Services Web Enrollment).

## Kiến trúc

```
Client (máy đã join domain, tự trust root CA qua GPO)
        │  HTTPS (443) — cert do AD CS cấp cho aelc.corp.<domain>
        ▼
   nginx (reverse proxy, TLS termination)
        │  HTTP nội bộ, có header X-Forwarded-Proto: https
        ├──► web:3000   (Next.js)
        └──► api:3001   (NestJS)
```

`apps/web` đã đọc `x-forwarded-proto` (xem
[apps/web/src/app/api/auth/login/route.ts](../apps/web/src/app/api/auth/login/route.ts))
nên không cần sửa code nữa — chỉ cần nginx set đúng header này.

## Các bước triển khai

### 1. Đăng ký DNS nội bộ thật

Nhờ DevOps/IT tạo một A record trong DNS nội bộ (AD-integrated), ví dụ:

```
aelc.corp.seta-international.vn.   A   192.168.8.64
```

Tên miền này phải nằm trong domain nội bộ mà AD CS được cấu hình để cấp
chứng chỉ (thường trùng với AD domain, hoặc một suffix được CA cho phép).

### 2. Tạo CSR trên máy deploy và xin cert từ CA nội bộ

Trên máy Windows chạy container (`192.168.8.64`), dùng `certreq` (đi kèm
Windows, join domain) để tạo request:

`aelc-web-server.inf`:
```ini
[Version]
Signature="$Windows NT$"

[NewRequest]
Subject = "CN=aelc.corp.seta-international.vn"
KeySpec = 1
KeyLength = 2048
Exportable = TRUE
MachineKeySet = TRUE
SMIME = FALSE
PrivateKeyArchive = FALSE
UserProtected = FALSE
UseExistingKeySet = FALSE
ProviderName = "Microsoft RSA SChannel Cryptographic Provider"
ProviderType = 12
RequestType = PKCS10
KeyUsage = 0xa0

[EnhancedKeyUsageExtension]
OID = 1.3.6.1.5.5.7.3.1 ; Server Authentication

[Extensions]
2.5.29.17 = "{text}"
_continue_ = "dns=aelc.corp.seta-international.vn&"
```

```powershell
certreq -new aelc-web-server.inf aelc-web-server.csr
# Nộp CSR cho CA nội bộ (chọn template "WebServer" hoặc tương đương do IT chỉ định)
certreq -submit -config "<CA_SERVER>\<CA_NAME>" aelc-web-server.csr aelc-web-server.cer
certreq -accept aelc-web-server.cer
```

Nếu IT đã cấp quyền tự phục vụ qua Certificate Services Web Enrollment
(`https://<CA_SERVER>/certsrv`), có thể dùng web UI thay cho `certreq` dòng
lệnh — quy trình tương đương.

Sau khi `certreq -accept`, cert nằm trong Windows Certificate Store của máy
đó (`Local Machine\Personal`). Export ra file PEM cho nginx dùng:

```powershell
$cert = Get-ChildItem Cert:\LocalMachine\My | Where-Object { $_.Subject -match "aelc.corp" }
# Export cert + private key sang PFX trước, rồi convert sang PEM/KEY cho nginx (openssl có sẵn trong Git Bash)
Export-PfxCertificate -Cert $cert -FilePath aelc.pfx -Password (Read-Host -AsSecureString "PFX password")
```

```bash
openssl pkcs12 -in aelc.pfx -clcerts -nokeys -out aelc.crt
openssl pkcs12 -in aelc.pfx -nocerts -nodes -out aelc.key
```

Đặt `aelc.crt`/`aelc.key` vào `nginx/certs/` (xem cấu trúc bên dưới) —
**không commit các file này vào git**.

### 3. nginx reverse proxy với TLS termination

Tạo `nginx/nginx.conf`:

```nginx
server {
    listen 80;
    server_name aelc.corp.seta-international.vn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name aelc.corp.seta-international.vn;

    ssl_certificate     /etc/nginx/certs/aelc.crt;
    ssl_certificate_key /etc/nginx/certs/aelc.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://api:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Thêm service `nginx` vào `docker-compose.prod.yml`, mount cert và conf,
publish `80`/`443` thay vì publish trực tiếp `3000`/`3001` ra ngoài:

```yaml
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    depends_on:
      - web
      - api
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    ports:
      - "80:80"
      - "443:443"
```

Sau đó bỏ `ports: ["3000:3000"]` và `ports: ["3001:3001"]` khỏi `web`/`api`
trong `docker-compose.prod.yml` — chúng chỉ cần expose trong mạng compose
nội bộ, nginx là cổng vào duy nhất.

### 4. Cập nhật env cho domain thật

`apps/api/.env` (trên máy deploy):
```
CORS_ORIGIN=https://aelc.corp.seta-international.vn
```

`docker-compose.prod.yml` build arg (qua biến môi trường khi chạy
`docker compose build`):
```
NEXT_PUBLIC_API_URL=https://aelc.corp.seta-international.vn/api
```

### 5. Gia hạn chứng chỉ

Chứng chỉ AD CS mặc định có hạn (thường 1 năm cho template WebServer, tuỳ
IT cấu hình). Cần một quy trình gia hạn — hỏi DevOps/IT xem có `certreq`
auto-enrollment cho service account/máy này không, hoặc lên lịch nhắc gia
hạn thủ công. Đây là câu hỏi nằm trong danh sách gửi IT bên dưới.

## Câu hỏi cụ thể để hỏi đội DevOps/IT

Gửi nguyên văn (hoặc điều chỉnh theo kênh liên hệ nội bộ):

> Chào team DevOps/IT,
>
> Bên mình đang chuẩn hoá TLS cho `aelc-platform` (web app nội bộ, hiện chạy
> tại `192.168.8.64:3000`/`3001` qua HTTP thuần) theo hướng dùng PKI nội bộ
> thay vì self-signed cert. Nhờ team xác nhận giúp:
>
> 1. Công ty đã có **AD Certificate Services (AD CS)** chạy chưa? Nếu có,
>    CA server/tên CA là gì, và mình cần quyền gì để xin chứng chỉ web
>    server (certificate template nào được phép dùng)?
> 2. Root certificate của CA nội bộ đã được phân phối tới các máy join
>    domain qua Group Policy chưa (để trình duyệt tự trust, không cần cài
>    thủ công)?
> 3. Mình có thể xin tạo một DNS record nội bộ (A record) cho
>    `aelc.corp.<domain-nội-bộ>` trỏ tới `192.168.8.64` không? Domain nội
>    bộ chính xác team đang dùng là gì (để đặt đúng CN/SAN cho CSR)?
> 4. Chứng chỉ từ CA nội bộ có hạn bao lâu, và có auto-enrollment cho máy
>    server không, hay mình cần tự làm quy trình gia hạn thủ công?
> 5. Máy `192.168.8.64` (runner tự host chạy deploy) hiện đã join AD domain
>    chưa? Nếu chưa, đây có phải bước bắt buộc trước khi `certreq` hoạt
>    động không?
>
> Cảm ơn team!

## Việc cần dọn dẹp nếu trước đó đã áp dụng hướng self-signed/hosts

- Gỡ mọi self-signed cert đã import vào Trusted Root trên các máy client
  từng làm thủ công.
- Revert các dòng thêm vào `hosts` file (`C:\Windows\System32\drivers\etc\hosts`
  trên client, hoặc `/etc/hosts` trên máy Linux/macOS) trỏ tên miền giả về
  `192.168.8.64`.
- Sau khi DNS nội bộ thật hoạt động, các máy sẽ tự resolve đúng qua DNS —
  không cần hosts file nữa.
