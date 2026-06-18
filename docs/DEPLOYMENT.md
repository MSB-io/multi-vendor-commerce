# Multi-Vendor Commerce Platform - Deployment Guide

## Overview
This document outlines the step-by-step deployment process for the Multi-Vendor Commerce Platform. It covers local development, CI/CD pipeline automation (via Jenkins), and manual operations directly targeting AWS EKS.

---

## 1. Local Development Deployment

To spin up the multi-container stack locally for testing and debugging, use the following commands.

### Prerequisites
* Install Docker and Docker Compose.
* Navigate to the repository root directory.

### Commands

* **Build and start all services in the background**:
  ```bash
  docker compose up -d --build
  ```
* **Verify service health and containers running**:
  ```bash
  docker compose ps
  ```
* **View live backend and frontend container logs**:
  ```bash
  docker compose logs -f
  ```
* **Initialize/verify local database content**:
  ```bash
  # Log into the postgres container and query users
  docker compose exec db psql -U user -d commerce -c "SELECT * FROM users;"
  ```
* **Tear down local stack and clear data volumes**:
  ```bash
  docker compose down -v
  ```

---

## 2. Infrastructure Deployment (Terraform)

Before deploying the application, the underlying AWS cloud infrastructure must be provisioned.

```bash
# Navigate to terraform directory
cd terraform

# Initialize providers and modules
terraform init

# Validate configuration syntactical validity
terraform validate

# View planned infrastructure changes
terraform plan -out=tfplan

# Apply changes (injecting required variables)
terraform apply -var="db_password=MySecretPassword123" -auto-approve
```

---

## 3. Jenkins CI/CD Pipeline (Jenkinsfile Stages)

The automated deployment is orchestrated by the [Jenkinsfile](file:///Users/manthan/Desktop/Devops/jenkins/Jenkinsfile) in the repository. Below are the exact commands executed inside each pipeline stage.

### Stage 1: Local Dependency Build & Test (Optional verification)
If verifying dependencies and compiling tests before packaging:
```bash
# Backend tests
cd app/backend
npm ci
npm test

# Frontend build check
cd ../frontend
npm ci
npm run build
```

### Stage 2: Docker Image Build
Two separate multi-stage builds are executed from the repository root:
```bash
# Build backend container
docker build -t commerce-backend -f docker/Dockerfile.backend .

# Build frontend container
docker build -t commerce-frontend -f docker/Dockerfile.frontend .
```

### Stage 3: Push to Amazon ECR
Images are tagged with the respective AWS Account ID and pushed:
```bash
# Login to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 040066346143.dkr.ecr.ap-south-1.amazonaws.com

# Tag backend and push
docker tag commerce-backend:latest 040066346143.dkr.ecr.ap-south-1.amazonaws.com/commerce-backend:latest
docker push 040066346143.dkr.ecr.ap-south-1.amazonaws.com/commerce-backend:latest

# Tag frontend and push
docker tag commerce-frontend:latest 040066346143.dkr.ecr.ap-south-1.amazonaws.com/commerce-frontend:latest
docker push 040066346143.dkr.ecr.ap-south-1.amazonaws.com/commerce-frontend:latest
```

### Stage 4: Kubernetes Deployment (EKS)
Jenkins authenticates to EKS and updates the deployments:
```bash
# Authenticate kubectl to the EKS cluster
aws eks update-kubeconfig --region ap-south-1 --name commerce-cluster

# Deploy resources
kubectl apply -f kubernetes/

# Force a rolling update to pull the latest images
kubectl rollout restart deployment backend frontend

# Monitor rollout progress
kubectl rollout status deployment/backend
kubectl rollout status deployment/frontend
```

---

## 4. Manual Deployment Operations & Verification

If deploying or verifying manually outside the CI/CD pipeline:

* **Retrieve application URLs**:
  ```bash
  # Find the Application Load Balancer DNS name for the frontend
  kubectl get service frontend-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
  ```
* **Verify active Kubernetes deployments & replica statuses**:
  ```bash
  kubectl get deployments,pods,services,hpa
  ```
* **Access Pod logs directly**:
  ```bash
  # Backend container logs
  kubectl logs -l app=backend --tail=100
  
  # Frontend static routing logs
  kubectl logs -l app=frontend --tail=100
  ```

