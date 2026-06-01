# InferX-ML Cloud-Native Deployment Plan

## 🎯 Goal
Deploy InferX-ML as a production-grade, cloud-native platform with scalable ML workloads, reliable storage, secure secrets, and observability. This plan maps the existing Docker-based architecture into a Kubernetes-first deployment while preserving local Docker Compose for dev.

---

## 🧩 System Components (from repo)

| Component | Purpose | Source | Runtime |
|---|---|---|---|
| `frontend` | React UI | `frontend/` | Node + Vite / Nginx in prod |
| `backend` | Flask API + orchestration | `backend/` | Python + Flask |
| `celery` | Background training tasks | `backend/` | Python + Celery |
| `celery-beat` | Scheduled jobs | `backend/` | Python + Celery Beat |
| `streamlit` | Prediction UI | `streamlit_app/` | Streamlit |
| `postgres` | Metadata DB | Docker image | PostgreSQL 15 |
| `redis` | Celery broker/result backend | Docker image | Redis 7 |
| `minio` | Artifact/Object storage | Docker image | MinIO |
| `mailer` | SMTP-based notification service | `mailer/` | Node + Express |

---

## 🏗️ Target Cloud Architecture (Kubernetes)

```
┌───────────────────────────────────────────────────────────────┐
│                        Cloud Load Balancer                    │
└───────────────┬──────────────────────────┬────────────────────┘
                │                          │
                ▼                          ▼
     ┌──────────────────┐         ┌──────────────────┐
     │  Ingress / API GW │         │  Ingress / UI GW │
     └────────┬─────────┘         └────────┬─────────┘
              │                            │
              ▼                            ▼
┌────────────────────────┐      ┌────────────────────────┐
│ Flask Backend (API)    │      │ React Frontend (UI)    │
│ Deployment + Service   │      │ Deployment + Service   │
└────────┬───────────────┘      └────────┬───────────────┘
         │                               │
         ▼                               ▼
┌────────────────────────┐      ┌────────────────────────┐
│ Celery Workers          │      │ Streamlit UI          │
│ Deployment + HPA        │      │ Deployment + Service  │
└────────┬───────────────┘      └────────┬───────────────┘
         │                               │
         ▼                               ▼
┌───────────────────────────────────────────────────────────────┐
│ PostgreSQL │ Redis │ MinIO │ Mailer │ Monitoring │ Logging    │
└───────────────────────────────────────────────────────────────┘
```

---

## ☁️ AWS Reference Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                           Amazon Route 53                        │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Application Load Balancer (ALB)               │
└───────────────┬──────────────────────────┬───────────────────────┘
                │                          │
                ▼                          ▼
     ┌──────────────────┐         ┌──────────────────┐
     │ EKS Ingress (API)│         │ EKS Ingress (UI) │
     └────────┬─────────┘         └────────┬─────────┘
              │                            │
              ▼                            ▼
┌────────────────────────┐      ┌────────────────────────┐
│ Flask Backend (EKS)    │      │ React Frontend (EKS)   │
└────────┬───────────────┘      └────────┬───────────────┘
         │                               │
         ▼                               ▼
┌────────────────────────┐      ┌────────────────────────┐
│ Celery Workers (EKS)   │      │ Streamlit UI (EKS)     │
└────────┬───────────────┘      └────────┬───────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ RDS (Postgres) │ ElastiCache (Redis) │ S3 (Artifacts) │ SES/SMTP │
└──────────────────────────────────────────────────────────────────┘
```

### AWS Service Mapping

| InferX Component | AWS Service | Notes |
|---|---|---|
| Kubernetes | **EKS** | Managed control plane + worker node groups |
| Container registry | **ECR** | Store backend/worker/frontend/streamlit images |
| DB | **RDS (PostgreSQL)** | Replace in-cluster Postgres |
| Redis | **ElastiCache (Redis)** | Replace in-cluster Redis |
| Object storage | **S3** | Replace MinIO for datasets/models/artifacts |
| Ingress | **ALB Ingress Controller** | Path-based routing for UI/API |
| Secrets | **Secrets Manager** + K8s Secret Sync | Secure key storage |
| Logs/Metrics | **CloudWatch** + **Prometheus/Grafana** | Centralized observability |
| SMTP | **SES** (or external SMTP) | Mailer service backend |

---

## ✅ Deployment Strategy (High-Level)

1. **Container Build & Registry**
   - Build images from `docker/` Dockerfiles.
   - Push to a container registry (ECR/GCR/ACR/DockerHub).

2. **Kubernetes Manifests or Helm**
   - Deploy each service as a Deployment + Service.
   - Use separate namespaces for `prod`, `staging`, `dev`.

3. **Storage & Persistence**
   - PostgreSQL → StatefulSet + PersistentVolume (or managed DB).
   - MinIO → StatefulSet + PersistentVolume (or managed object storage).
   - Redis → Deployment + Persistence (or managed Redis).

4. **Ingress + TLS**
   - Use NGINX Ingress or managed API gateway.
   - Configure TLS via cert-manager.

5. **Secrets & Config**
   - Use Kubernetes Secrets for API keys, SMTP, DB creds.
   - Use ConfigMaps for non-sensitive configs.

6. **Scaling & GPU**
   - Horizontal Pod Autoscaler for `backend`, `celery`, `streamlit`.
   - GPU node pool for ML workloads; assign via `nodeSelector`/`tolerations`.

---

## 🧭 AWS Networking & Security Baseline

1. **VPC Design**
   - Public subnets: ALB, NAT Gateways.
   - Private subnets: EKS nodes, RDS, ElastiCache.

2. **Security Groups**
   - ALB → EKS (HTTP/HTTPS only).
   - EKS → RDS/ElastiCache (private ports).

3. **IAM**
   - IAM Roles for Service Accounts (IRSA) for S3/Secrets access.
   - Restrict build/deploy roles to least privilege.

---

## 📦 Kubernetes Workload Mapping

| Service | K8s Type | Notes |
|---|---|---|
| Backend | Deployment | CPU/GPU variants; connect to Redis/DB/MinIO |
| Celery | Deployment | Scale independently; HPA on queue depth if possible |
| Celery Beat | Deployment | Single replica |
| Frontend | Deployment | Serve static build with Nginx in prod |
| Streamlit | Deployment | Optional GPU for heavy inference |
| Postgres | StatefulSet | Use PVC or managed DB (recommended) |
| Redis | Deployment | Use managed Redis for production |
| MinIO | StatefulSet | Use PVC or replace with S3/GCS |
| Mailer | Deployment | Lightweight, stateless |

---

## 🔐 Configuration & Secrets

Required runtime envs (from `.env.example`):

- **Backend/Workers**: `DATABASE_URL`, `REDIS_URL`, `MINIO_*`, `JWT_SECRET_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `MAILER_URL`, `RAZORPAY_*`
- **Mailer**: `SMTP_*`
- **Frontend**: `VITE_API_URL`
- **Streamlit**: `API_URL`

Store secrets in **Kubernetes Secrets** and mount as env vars. Use sealed-secrets or a vault (AWS Secrets Manager / HashiCorp Vault) in production.

---

## 📁 Storage Plan

| Data | Recommended Storage |
|---|---|
| ML models & artifacts | MinIO (PVC) or S3-compatible storage |
| Datasets | MinIO or object store |
| Metadata & users | Managed PostgreSQL |
| Task queues | Redis (managed) |

**Migration to Cloud Object Storage** (optional):
- Replace MinIO with S3/GCS + update env vars to point to gateway.

---

## ⚖️ Scaling Strategy

- **Backend**: scale by CPU/memory; HPA based on request latency & CPU.
- **Celery**: scale by queue size; use `celery-exporter` or Redis metrics.
- **Streamlit**: scale by active sessions.
- **DB/Redis/MinIO**: scale vertically; prefer managed services.

---

## 🚦 Networking & Routing

| Endpoint | Route |
|---|---|
| React UI | `/` via UI Ingress |
| Flask API | `/api/*` via API Ingress |
| Streamlit | `/streamlit` or separate subdomain |
| MinIO Console | restricted via VPN or admin-only Ingress |

---

## 🧪 CI/CD Pipeline (Recommended)

1. **Build** images on push to `main`.
2. **Run tests** (backend + unit tests).
3. **Push** images to registry with git SHA tag.
4. **Deploy** via Helm or Kustomize.
5. **Post-deploy checks**: health endpoints, DB connectivity.

---

## 🚀 AWS CI/CD Options

### Option A: GitHub Actions + ECR + EKS (Recommended)

1. **Build & Test**
   - Run Python + Node tests.
   - Build Docker images for `backend`, `celery`, `frontend`, `streamlit`, `mailer`.

2. **Publish**
   - Push images to **ECR** with Git SHA tag.

3. **Deploy**
   - `kubectl` / `helm upgrade` to EKS with new image tags.
   - Use Kustomize or Helm for environment-specific values.

4. **Post-Deploy Verification**
   - Smoke test API endpoints.
   - Verify migrations/health checks.

**Required AWS IAM Permissions** (for CI/CD):
- `ecr:*` (scoped to repo), `eks:DescribeCluster`, `eks:UpdateClusterConfig`,
  `sts:AssumeRole`, `secretsmanager:GetSecretValue`.

### Option B: AWS CodePipeline + CodeBuild

1. Source: GitHub or CodeCommit
2. Build: CodeBuild builds and pushes images to ECR
3. Deploy: CodeDeploy or Helm via CodeBuild step

---

## 📊 Observability

- **Logging**: Fluent Bit → Loki/Elastic.
- **Metrics**: Prometheus + Grafana.
- **Tracing**: OpenTelemetry (optional).
- **Health checks**: `liveness` + `readiness` for each service.

---

## 🛡️ Security Checklist

- Use HTTPS everywhere (TLS).
- Rotate API keys and SMTP credentials.
- Set `JWT_SECRET_KEY` and `SECRET_KEY` to strong values.
- Restrict admin endpoints and MinIO console.
- Enable rate limiting (already supported in backend).

---

## ✅ Minimal Production-Ready Stack (Recommended)

- **Managed PostgreSQL** (RDS/CloudSQL)
- **Managed Redis** (Elasticache/MemoryStore)
- **S3/GCS** for object storage (replace MinIO)
- **Kubernetes (EKS)** for API + workers + UI

---

## 🗺️ Deployment Phases

### Phase 1: Lift-and-Shift
- Docker Compose → Kubernetes without refactor.
- Use MinIO + in-cluster Postgres/Redis.

### Phase 2: Managed Services
- Migrate DB, Redis, storage to managed services.

### Phase 3: Scale & Optimize
- GPU node pool for ML training.
- Horizontal scaling + auto-scaling policies.
- Add observability and alerting.

---

## 📌 Notes for GPU Support

- Use GPU node pools and assign `NVIDIA_VISIBLE_DEVICES=all`.
- Ensure CUDA base images (already supported in `docker-compose.gpu.yml`).
- Install NVIDIA device plugin in K8s.

---

## 🧾 AWS Deployment Checklist (Quick Start)

- [ ] Create EKS cluster + managed node groups (CPU + optional GPU).
- [ ] Create ECR repos for each service.
- [ ] Provision RDS (Postgres) + ElastiCache (Redis).
- [ ] Create S3 buckets for datasets/models/artifacts.
- [ ] Configure Secrets Manager + IRSA.
- [ ] Install ALB Ingress Controller.
- [ ] Deploy Helm/Kustomize manifests.
- [ ] Configure CloudWatch logs and alarms.

## ✅ Deliverables Checklist

- [ ] Container images built & pushed
- [ ] K8s manifests or Helm chart created
- [ ] Secrets stored securely
- [ ] Ingress configured with TLS
- [ ] Autoscaling enabled
- [ ] Observability installed
- [ ] Backups configured

---

## 📎 Files Referenced

- `docker-compose.yml` (service map)
- `docker-compose.gpu.yml` (GPU overrides)
- `docker/Dockerfile.*` (builds)
- `.env.example` (environment variables)
- `backend/app/config.py` (runtime defaults)

---

## ✅ Next Suggested Improvements (Optional)

- Convert Dockerfiles to multi-stage production builds (smaller images).
- Add `helm/` chart for deployment consistency.
- Add `k8s/` manifests for each service.
- Add backups for PostgreSQL and object storage.
