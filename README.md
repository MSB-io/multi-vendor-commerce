# Multi-Vendor Commerce Platform

This repository houses the code and DevOps assets for the Multi-Vendor Commerce Platform, showcasing a cloud-native microservices architecture backed by a fully automated CI/CD pipeline and cloud infrastructure on AWS.

---

## 📖 Complete Documentation Index

To explore the architecture, operations, and recovery procedures in detail, refer to the following documents:

*   **[documentation.md](file:///Users/manthan/Desktop/Devops/documentation.md)**: Main, detailed guide covering subsystems (React frontend, Express backend, Postgres db schema), local development setup, CI/CD stages, Kubernetes config mapping, troubleshooting pivots, and a complete command reference.
*   **[docs/ARCHITECTURE.md](file:///Users/manthan/Desktop/Devops/docs/ARCHITECTURE.md)**: High-level infrastructure diagram, user request routing flow, and structural component breakdown.
*   **[docs/DEPLOYMENT.md](file:///Users/manthan/Desktop/Devops/docs/DEPLOYMENT.md)**: Step-by-step deployment guide with exact commands for local compose runs, Terraform provisioning, and EKS deployments.
*   **[docs/DISASTER_RECOVERY.md](file:///Users/manthan/Desktop/Devops/docs/DISASTER_RECOVERY.md)**: Crisis runbook outlining recovery steps for database crashes, regional outages, Jenkins instance recovery, and pod load-spikes.

---

## 🚀 Quick Runbook Command Cheat Sheet

### 1. Local Stack Orchestration (Docker Compose)
Launch the application and its database locally:
```bash
# Start all application containers
docker compose up -d --build

# Run local monitoring stack (Elasticsearch, Kibana, Grafana)
docker compose -f docker/docker-compose.monitoring.yml up -d

# Tear down local stack and reset volumes
docker compose down -v
```

### 2. Infrastructure Setup (Terraform)
Provision the VPC, EKS Cluster, RDS instance, ECR registry, and EC2 instances:
```bash
cd terraform
terraform init
terraform plan -out=tfplan
terraform apply -var="db_password=YourDatabaseSecretPassword123" -auto-approve
```

### 3. Deploying to AWS EKS
Authenticate and apply Kubernetes manifests:
```bash
# Pull cluster authentication token
aws eks update-kubeconfig --region ap-south-1 --name commerce-cluster

# Deploy resources to EKS cluster
kubectl apply -f kubernetes/

# Roll out update pulls
kubectl rollout restart deployment backend frontend
```

### 4. Resolving IP Exhaustion (AWS Free Tier EKS Worker Nodes)
If rolling updates get stuck in `Pending` due to EKS IP address shortages:
```bash
# Terminate running pods to release ENI IP allocations
kubectl scale deployment backend frontend --replicas=0

# Verify pods are scaled down
kubectl get pods

# Scale back up to target replica count
kubectl scale deployment backend frontend --replicas=2
```

---

## 🛠 Delivered DevOps Artifacts

| Requirement | Implementation Details | Link Reference |
|---|---|---|
| **Working Application** | React JS frontend & Node.js/Express API | [app/](file:///Users/manthan/Desktop/Devops/app) |
| **Infrastructure as Code** | Terraform scripts for VPC, EKS, RDS, ECR, EC2 | [terraform/](file:///Users/manthan/Desktop/Devops/terraform) |
| **Docker Images** | Multi-stage optimization builds | [docker/](file:///Users/manthan/Desktop/Devops/docker) |
| **CI/CD Automation** | Declarative Jenkins Pipeline automation | [jenkins/Jenkinsfile](file:///Users/manthan/Desktop/Devops/jenkins/Jenkinsfile) |
| **Kubernetes manifests** | Highly available setups with HPA scaling policies | [kubernetes/](file:///Users/manthan/Desktop/Devops/kubernetes) |
| **Telemetry & Observability** | Centralized logging (ELK) & monitoring (Grafana) | [docker-compose.monitoring.yml](file:///Users/manthan/Desktop/Devops/docker/docker-compose.monitoring.yml) |
| **Secret Management** | Vault integrations for database URL parameterization | [db-secret.yaml](file:///Users/manthan/Desktop/Devops/kubernetes/db-secret.yaml) |

