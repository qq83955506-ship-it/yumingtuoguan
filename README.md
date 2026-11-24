# 免费域名管理中心（Cloudflare Pages）

深色风格、个人使用。支持域名登记、申请平台、注册日期、到期日期、账号、加密密码、备注、搜索筛选、到期状态统计、JSON 备份/恢复。

## 重要安全说明
- 登录管理密码至少 12 位；服务端使用 PBKDF2-SHA-256（310,000 次）保存密码哈希。
- 域名平台账号和密码由浏览器 Web Crypto API 使用 AES-256-GCM 加密后再提交；D1 只保存密文。
- 加密密钥由管理密码通过 PBKDF2 派生，不会发送给服务器。
- 请务必记住管理密码。忘记密码后，已保存的加密平台密码无法恢复。
- 导出的 JSON 备份包含加密后的密文，不包含明文密码；请仍然妥善保管备份。
- 建议启用 Cloudflare 账户双重验证，并只在自己的设备上登录。
- 这是个人轻量保险箱，不等同于经过第三方审计的专业密码管理器。

## 部署（Cloudflare Pages + D1）

### 1. 创建 D1 数据库
1. 登录 Cloudflare Dashboard。
2. 打开 **Workers & Pages → D1 SQL Database**。
3. 创建数据库，名称填写 `free-domain-manager`。
4. 进入数据库的 Console，执行项目根目录 `schema.sql` 中的全部 SQL。

### 2. 上传到 GitHub
1. 解压本项目 ZIP。
2. 新建一个 GitHub 仓库，例如 `free-domain-manager`。
3. 把解压后的所有文件和文件夹上传到仓库根目录（不要再套一层文件夹）。

### 3. 创建 Pages 项目
1. Cloudflare Dashboard → **Workers & Pages → Create application → Pages → Connect to Git**。
2. 选择刚才的 GitHub 仓库。
3. Framework preset 选 **None**。
4. Build command 留空；Build output directory 填 `public`。
5. 保存并部署。

### 4. 绑定 D1
进入 Pages 项目 → Settings → Functions → D1 database bindings：
- Variable name：`DB`
- D1 database：选择刚创建的 `free-domain-manager`
保存后重新部署。

### 5. 设置 SESSION_SECRET
Pages 项目 → Settings → Variables and Secrets → Add：
- Name：`SESSION_SECRET`
- Value：填写一段随机长字符串（建议至少 32 字符，勿使用示例密码）
把它设为 Secret，而不是普通明文变量。保存后重新部署。

### 6. 首次使用
打开 Cloudflare Pages 分配给你的网址。第一次打开会要求创建管理密码（至少 12 位）。之后用该密码登录。

## 日常使用
- 添加域名：填写域名、申请平台、到期日期；其他信息可选。
- 密码：保存时在浏览器加密；编辑时密码留空表示不修改原密码。
- 到期状态：按浏览器当前日期自动计算；30 天内显示“即将到期”，已过期显示“已过期”。
- 备份：点击“导出备份”下载 JSON；导入时会逐条新增，不会覆盖现有记录。

## 说明
本项目没有自动查询注册商到期日的功能；到期日期需要手动填写。当前提醒只在网站列表和统计卡片中显示，不会主动推送通知。
