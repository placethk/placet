# Generic Example Fragments - `PROJECT_KNOWLEDGE_BASE.md`

> Note: this is a **structure demo**, not bound to any specific business domain. Treat it as a reference for "what it looks like and how to fill fields".
> When generating a real KB, content is replaced with your project data.

---

## 1. Project overview (example)

- **Positioning**: the core capability set of a business system (orders / alerts / reports / ops / risk, or any domain)
- **Architecture**: Maven multi-module / microservices / layered monolith (concluded from build files and directories)
- **Module stats**: X aggregation entries, Y business modules, Z foundation modules, W build/deploy modules

---

## 2. Module business dictionary (example table)

| Module | Type | Business meaning | Core functions | Priority |
|---|---|---|---|---|
| app-gateway | Aggregation | Unified external entry and routing | Routing, auth, rate limit, request orchestration | High |
| domain-xxx | Business | Business capability implementation and orchestration | Domain rules, business flows, data changes | High |
| common-core | Foundation | Shared foundation capabilities | JSON/date/validate/log/common exceptions | Medium |
| build-tools | Build | Compile, package, quality gates | Plugin config, CI entry, artifact publish | Medium |

---

## 3. Reusable utility index (Util/Helper full index + notes)

### 3.1 Full-index fields (example)

| Class | Path | Category | Function summary | Usage scenario | Reuse level | Dependency complexity | Risk |
|---|---|---|---|---|---|---|---|
| DateTimeUtil | `common/utils/DateTimeUtil.java` | DateTime | Time format conversion / timezone handling | Scheduled jobs, report stats | High | Low | Low |
| JsonUtil | `common/utils/JsonUtil.java` | Convert | JSON serialize/deserialize wrapper | API in/out, config parse | High | Low | Low |
| HttpClientUtil | `common/net/HttpClientUtil.java` | Network | HTTP call with timeout/retry | External dependency calls | Medium | Medium | Medium |
| FileUtil | `common/io/FileUtil.java` | File | File I/O and path helpers | Import/export, log persistence | Medium | Low | Medium |

### 3.2 High-reuse TOP 10 (example; MUST be filtered from the full index)

1. DateTimeUtil (unified time entry)
2. JsonUtil (unified JSON handling)
3. BeanCopyUtil (DTO/Entity conversion)
4. HttpClientUtil (external-call wrapper)
5. FileUtil (file I/O)
6. RetryHelper (generic retry policy)
7. ValidateUtil (parameter validation)
8. TraceContextUtil (trace context)
9. IdGeneratorUtil (ID / serial generation)
10. CollectionUtil (collection helpers)

---

## 4. Existing flow-diagram / visual-asset index (example)

| Asset | Type | Path | Related domain | Flow summary (1-3 lines) |
|---|---|---|---|---|
| xxx_flow.puml | PUML | `docs/diagram/xxx_flow.puml` | Main business flow | Trigger -> compute -> call -> output |
| xxx_sequence.png | PNG | `docs/diagram/xxx_sequence.png` | Exception / edge | Happy-path / exception-path interaction |

---

## 4.1 Script and configuration asset index (example)

### 4.1.1 Python scripts

| File | Type | Path | Function summary | Execution context | Dependencies |
|---|---|---|---|---|---|
| `k8s_pod.py` | Script | `aiops-build/k8s/zabbixScript/k8s_pod.py` | K8s Pod resource monitoring collection | Zabbix probe invocation | Python 3 + k8s client |
| `backup.py` | Script | `aiops-build/python_service/backup.py` | System config backup | Scheduled job | Python 3 |

### 4.1.2 Shell scripts

| File | Type | Path | Function summary | Execution context |
|---|---|---|---|---|
| `start_agent.sh` | Script | `aiops-build/zabbix/agent/start_agent.sh` | Start Zabbix probe | Server startup |
| `stop_agent.sh` | Script | `aiops-build/zabbix/agent/stop_agent.sh` | Stop Zabbix probe | Admin manual run |

### 4.1.3 Key config files

| File | Type | Path | Role |
|---|---|---|---|
| `platform.properties` | Config | `aiops-build/config/conf/platform.properties` | Platform base config |
| `jdbc.properties` | Config | `aiops-https-service/config/database/jdbc.properties` | Database connection config |
| `elasticsearch.properties` | Config | `aiops-https-service/config/elasticsearch/elasticsearch.properties` | Elasticsearch connection config |

### 4.1.4 Kubernetes deploy configs

| File | Type | Path | Role |
|---|---|---|---|
| `start-aiops-service.yaml` | Deployment | `aiops-build/k8s/start-aiops-service.yaml` | AIOps backend service deploy |
| `start-aiops-agent.yaml` | DaemonSet | `aiops-build/k8s/start-aiops-agent.yaml` | Probe agent deploy |

---

## 5. Tech stack and versions (example table)

| Layer | Technology | Version | Evidence (MUST be traceable) |
|---|---|---|---|
| Build | Maven / Gradle | `x.y.z` | `pom.xml` / `build.gradle` |
| Framework | Spring Boot / Quarkus / NestJS, etc. | `x.y.z` | Dependency config location |
| DB | MySQL / PostgreSQL | `x.y.z` | Config file or dependency definition |
| Cache/MQ | Redis / Kafka / RabbitMQ | `x.y.z` | starter and config keys |

---

## 6. Startup entries (example)

### 6.1 Application main classes

| Module | Main class | Type | Role |
|---|---|---|---|
| `xxx-app` | `com.example.XxxApplication` | SERVLET / NONE | Main service entry, aggregates A/B/C submodules |
| `xxx-web-app` | `com.example.XxxWebApplication` | SERVLET | Admin console Web |
| `xxx-worker-app` | `com.example.XxxWorkerApplication` | NONE | Background jobs / upgrade / async processing |

### 6.2 Deploy script entries

| Script | Path | Role |
|---|---|---|
| `start.sh` | `deploy/start.sh` | Start all services (DB → cache → Java → agent) |
| `stop.sh` | `deploy/stop.sh` | Stop all services |
| `upgrade.sh` | `deploy/upgrade.sh` | Run DB upgrade + replace artifacts |

---

## 7. Main API list (example)

### 7.1 Internal REST services

| Service ID | Port | Path prefix | Notes |
|---|---|---|---|
| `UserRestService` | 8080 | `/v1/user` | User management |
| `AuthRestService` | 8080 | `/v1/auth` | AuthN/AuthZ |
| `ConfigRestService` | 8080 | `/v1/config` | Config management |

### 7.2 Open protocol APIs

| Path | Notes |
|---|---|
| `/oauth/authorize`, `/oauth/token` | OAuth2 authorization |
| `/.well-known/openid-configuration` | OIDC discovery |
| `/health`, `/check/alive` | Health checks |

---

## 8. Database tables / entity notes (example)

### 8.1 Tables by domain

| Script/prefix | Example tables | Role |
|---|---|---|
| `default.sql` | `T_CONFIG`, `T_LOG` | System base config and logs |
| `biz.sql` | `T_BIZ_ORDER`, `T_BIZ_ITEM` | Core business tables |
| `monitor.sql` | `T_MONITOR_HISTORY` | Monitoring and alerts |

### 8.2 Main entity/model locations

| Path | Notes |
|---|---|
| `module/xxx-service/src/main/java/.../entity` | Business entities |
| `module/xxx-service/src/main/java/.../dto` | API DTOs |
| `module/xxx-service/src/main/java/.../bo` | Business objects |
| `common/xxx-common/src/main/java/.../model` | Cross-module reusable models |

---

## 9. Config-file notes (example)

### 9.1 Application config

| File | Role |
|---|---|
| `xxx-app/src/main/resources/application.properties` | Main service config: port, datasource, logging, etc. |
| `xxx-web-app/src/main/resources/application.properties` | Web console config: template engine, static assets, etc. |

### 9.2 Deploy runtime config

| File | Role |
|---|---|
| `deploy/config/jdbc.properties` | Database connection config |
| `deploy/config/redis.properties` | Cache connection config |
| `deploy/config/app.properties` | Platform main config |
| `deploy/nginx/*.conf` | Reverse-proxy config |

### 9.3 Spring / IoC config

| File/directory | Role |
|---|---|
| `src/main/resources/META-INF/spring-*.xml` | Platform bean wiring |
| `src/main/resources/i18n/*.properties` | i18n copy |

---

## 10. Build, run, deploy (example)

### 10.1 Local compile

```bash
# Full build
mvn clean package

# Single-module build
mvn clean package -pl xxx-app -am
```

### 10.2 Package a deploy bundle

```bash
mvn clean package -pl xxx-build -am
```

Artifacts include: `app/*.jar`, `config/**`, `deploy/**`

### 10.3 Deploy and run

```bash
./deploy/start.sh    # start
./deploy/stop.sh     # stop
./deploy/upgrade.sh  # upgrade
```

---

## 11. Code issues and refactoring suggestions (example table)

| Issue ID | Finding | Evidence | Impact | Recommendation | Priority |
|---|---|---|---|---|---|
| R-01 | Utility class overloaded with duties | `common/utils/xxxUtil.java` | High change risk, hard to reuse | Split into single-responsibility utils and add unit tests | High |
| R-02 | Duplicated DTO conversion logic | Multiple `*/ServiceImpl.java` | High maintenance cost | Extract a shared converter and replace call sites | Medium |

---

## 12. Follow-up maintenance suggestions (example)

1. **Complete environment docs**: make explicit the dependency versions, repo URLs, and credential management for dev/test/prod.
2. **Generate API docs**: introduce OpenAPI or maintain method-level notes by service ID.
3. **Generate a data dictionary**: auto-generate field notes from DDL and Mapper files to avoid manual drift.
4. **Clean secrets**: check config files and CI scripts for tokens/passwords that MUST NOT be committed.
5. **Clarify module boundaries**: make call conventions and publish boundaries of submodules inside aggregation modules explicit.
6. **Normalize config sources**: document priority and change process for classpath config, external config, and platform XML.
7. **Strengthen tests**: add automated coverage around core business paths.
8. **Maintain upgrade scripts**: add rollback drills, idempotency checks, and pre-upgrade backup verification.
