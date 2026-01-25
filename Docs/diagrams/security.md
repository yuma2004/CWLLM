# ç¹§E»ç¹§E­ç¹ï½¥ç¹ï½ªç¹ãEãE

## é–¼ãƒ»E¨âˆšÎ”ç¹ãEÎœç¹ï½³ç¹§E°ãƒ»ãƒ»FD + Trust Boundaryãƒ»ãƒ»**éš±E¬è­è¶£E¼äº•ï½¸Â€é—Šï½¬ãƒ»ãƒ»*: ç¹ãEãƒ»ç¹§E¿ç¸ºE®è±¬âˆšï½Œç¸ºE¨è«E¡é¬E½¼è EEé˜œç¹§è²åºEš•é–€å–§ç¸ºåŠ±â€»é–¼ãƒ»E¨âˆšï½’è±¢åŠ±EèœƒEºç¸ºåŠ±âˆªç¸ºå¶Â€ãƒ» 
**ç¸ºè–™ãEç¹åŠ±ÎŸç¹§E¸ç¹§E§ç¹§E¯ç¹åŒ»ã€’ç¸ºE¯**: ç¹æ‚¶Î›ç¹§E¦ç¹§E¶ç¸ºE¯è­›ï½ªè«E¡é¬E½¼ç¸²âˆšãƒ°ç¹ãEã‘ç¹§E¨ç¹ï½³ç¹å³¨â€²éš±å´ï½¨E¼/éš±æ¦ŠåºE¸ºE¨èŸå¤œÎšAPIé¨¾E£è¬³Eºç¸ºE®è³E­è ¢ãƒ»ã€’ç¸ºå¶Â€ãƒ»```mermaid
flowchart TB
  subgraph Client[Untrusted]
    Browser[Browser]
  end
  subgraph Server[Trusted]
    API[Backend API]
    DB[(PostgreSQL)]
    Redis[(Redis)]
  end
  External["External APIs Chatwork OpenAI"]

  Browser -->|HTTPS| API
  API --> DB
  API --> Redis
  API -->|HTTPS| External
  External --> API
```

## STRIDEãƒ»è‚²æ¨Ÿè¿¥E¶ç¸ºE®èŸE½¾é²åE½¼ãƒ»| é–¼ãƒ»E¨ãƒ»| èŸE½¾è ¢ãƒ»|
| --- | --- |
| Spoofing | JWT + RBAC |
| Tampering | DBè›»E¶é‚ãE/ é€¶E£è­Ÿï½»ç¹ï½­ç¹§E° |
| Information Disclosure | Cookie `httpOnly`, `secure`(prod) |
| Denial of Service | rate-limit (login) |
| Elevation of Privilege | `requireAdmin` / `requireWriteAccess` |

## è®“ï½©é«¯èˆŒãEç¹åŒ»Îœç¹§E¯ç¹§E¹ãƒ»åŸŸï½¦ã‚‰æ‰•ãƒ»ãƒ»| è –ï½¹èœ‘ï½² | éš±E­ç¸ºE¿èœ¿æ‚¶EE| è­–ï½¸ç¸ºå´ï½¾E¼ç¸ºE¿ | é‚‚ï½¡é€EE|
| --- | --- | --- | --- |
| admin | ç¬¨ãƒ»| ç¬¨ãƒ»| ç¬¨ãƒ»|
| employee | ç¬¨ãƒ»| ç¬¨ãƒ»| - |

## é˜ä¼œï½¯ãƒ»ãƒ¥è£E±ç¸ºE®èœ¿æ‚¶EŠè¬E½±ç¸ºãƒ»ãƒµç¹ï½­ç¹ï½¼
**éš±E¬è­è¶£E¼äº•ï½¸Â€é—Šï½¬ãƒ»ãƒ»*: é˜ä¼œï½¯ãƒ»ãƒ¥è£E±ç¸ºå¾ŒâEç¸ºè–™ã€’è›»E©é€•ï½¨ç¸ºè¼”ï½Œç¹§ä¹Â°ç¹§å ¤E¤Eºç¸ºåŠ±âˆªç¸ºå¶Â€ãƒ» 
**ç¸ºè–™ãEç¹åŠ±ÎŸç¹§E¸ç¹§E§ç¹§E¯ç¹åŒ»ã€’ç¸ºE¯**: `.env`/è¿ºE°è EEE¤ç”»ç„šç¸ºä¹ï½‰èœ¿é–€E¾åŠ±E ç¸²EŒhatwork/OpenAIç¸ºE®éš±å´ï½¨E¼ç¹å€¥ãƒ£ç¹Â€ç¸ºE§è´E¿ç¸ºãƒ»âˆªç¸ºå¶Â€ãƒ»```mermaid
flowchart LR
  Env[".env / Render Env"] --> Backend["Backend Process"]
  Backend -->|Authorization: Bearer| OpenAI["OpenAI API"]
  Backend -->|x-chatworktoken| Chatwork["Chatwork API"]
```

## è­‰æ€œæ·è›¹ãƒ»- ç¹ä»£ã›ç¹ï½¯ç¹ï½¼ç¹ãE bcrypt ç¹ä¸Šãƒ£ç¹§E·ç¹ï½¥
- é¨¾å£»E¿E¡: HTTPSãƒ»åŒ»ãƒ§ç¹åŠ±ÎŸç¹§E¤è¿ºE°è EEâ†“è“æ™ï½­åE½¼ãƒ»- Cookie: `httpOnly`, `secure`(production)

## é€¶E£è­Ÿï½»ç¹ï½­ç¹§E°éšªE­éšªãƒ»| é¬EEå²¼ | èœ€ãƒ»E®E¹ |
| --- | --- |
| entityType / entityId | èŸE½¾é›ï½¡ |
| action | create/update/delete |
| changes | before/after |
| userId | è¬«å ºE½æ‡E€ãƒ»|

## SBOMãƒ»äº•ï½¾æ™ï½­å€E½¸Â€éš•ï½§ãƒ»ãƒ»- `frontend/package.json`
- `backend/package.json`

## ç¹§E»ç¹§E­ç¹ï½¥ç¹ï½ªç¹ãEãE¹ãEã›ç¹éƒE¨è‚²åˆ¤ãƒ»è‚²æ¨Ÿè¿¥E¶ãƒ»ãƒ»| éï½®è›»E¥ | è³æ»“å‘½ |
| --- | --- |
| SAST | è­›ï½ªèŸE¸»ãƒ» |
| DAST | è­›ï½ªèŸE¸»ãƒ» |
| è¬E¥è™šç¹ï½¬ç¹è–™Î—ç¹ï½¼ | é©•ï½©è³ãƒ»|

