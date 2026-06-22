# Multi-Vendor Commerce Platform: Complete DevOps Runbook & Presentation

This document serves as the **Single Source of Truth** for the entire project. It contains the complete system architecture, deployment commands from scratch, troubleshooting guides, and a roadmap for future enhancements. It is designed to be presented during a viva and used as a step-by-step runbook.

---

## 🏗️ 1. Architecture Overview

The application is a modern microservices platform built with React, Node.js, and PostgreSQL, deployed entirely on AWS using Cloud-Native DevOps practices.

```mermaid
graph TD
    subgraph AWS ["AWS Cloud (ap-south-1)"]
        ECR["Amazon ECR (Docker Registry)"]
        
        subgraph VPC ["VPC (commerce-vpc: 10.0.0.0/16)"]
            IGW["Internet Gateway (IGW)"]
            NAT["NAT Gateway"]
            
            subgraph PublicSubnets ["Public Subnets (10.0.101.0/24, 10.0.102.0/24)"]
                Jenkins["Jenkins CI/CD Server<br>(t3.micro)"]
                Vault["Vault Server<br>(t3.micro)"]
                ALB["Application Load Balancer (ALB)"]
            end
            
            subgraph PrivateSubnets ["Private Subnets (10.0.1.0/24, 10.0.2.0/24)"]
                subgraph EKS ["EKS Cluster (commerce-cluster)"]
                    Frontend["React Frontend Pods<br>(Nginx)"]
                    Backend["Node.js Backend Pods<br>(Express)"]
                end
                RDS[("Amazon RDS PostgreSQL<br>(commerce-db)")]
            end
        end
    end

    User((User/Browser)) -->|HTTP/HTTPS (Port 80/443)| ALB
    ALB -->|Forward to Target Group| Frontend
    Frontend -->|API Requests| Backend
    Backend -->|Database Queries (Port 5432)| RDS
    
    %% Outbound connections
    EKS -->|Outbound traffic| NAT
    NAT -->|Route to Internet| IGW
    IGW -->|Internet| PublicWeb((Public Internet))
    
    %% CI/CD & Image Flow
    Jenkins -->|Build & Push Images| ECR
    Jenkins -->|Deploys Manifests| EKS
    ECR -.->|Pull Images| EKS
    
    %% Styling
    classDef aws fill:#232F3E,stroke:#232F3E,stroke-width:2px,color:#fff;
    classDef vpc fill:#3B7F57,stroke:#3B7F57,stroke-width:2px,color:#fff;
    classDef subnet fill:#1C3B57,stroke:#1C3B57,stroke-width:1px,color:#fff;
    classDef resource fill:#FFFFFF,stroke:#232F3E,stroke-width:1px,color:#000;
    
    class AWS aws;
    class VPC vpc;
    class PublicSubnets,PrivateSubnets subnet;
    class Jenkins,Vault,ALB,Frontend,Backend,RDS,ECR,IGW,NAT resource;
```


---

## 🚀 2. Local Development (Testing before AWS)

Before touching the cloud, you can orchestrate the entire platform locally using Docker Compose.

```bash
# 1. Start the application stack (Database, Backend, Frontend)
docker compose up -d --build

# 2. (Optional) Start the Monitoring stack (ELK + Grafana)
docker compose -f docker/docker-compose.monitoring.yml up -d

# 3. View live logs
docker compose logs -f backend

# 4. Tear everything down and wipe local database volumes
docker compose down -v
```

---

## ☁️ 3. Cloud Provisioning from Scratch (AWS & Terraform)

All AWS infrastructure (VPC, EKS, RDS, ECR, EC2) is codified using Terraform.

**Step 1: Generate SSH Keys for the EC2 Instances**
Terraform requires a public key to attach to the Jenkins and Vault servers.
```bash
cd terraform
ssh-keygen -t rsa -b 2048 -f ../devops-key -N ""
```

**Step 2: Initialize and Apply Terraform**
```bash
terraform init
terraform plan -out=tfplan
# WARNING: This provisions real resources on AWS!
terraform apply -var="db_password=SecretPassword123!" -auto-approve
```

**Step 3: Extract Important Endpoints**
```bash
# Get the new RDS Database Endpoint:
aws rds describe-db-instances --query 'DBInstances[*].Endpoint.Address' --output text

# Get the Jenkins Server Public IP:
aws ec2 describe-instances --filters "Name=tag:Name,Values=Jenkins-Server" --query "Reservations[*].Instances[*].PublicIpAddress" --output text
```

---

## 🐳 4. Building & Pushing Docker Images

*Real-World Pivot:* If the local development machine lacks resources (e.g., Docker Desktop is not installed), you can use the newly provisioned Jenkins EC2 instance to execute the multi-stage Docker builds.

**Step 1: Transfer Code to the Jenkins EC2 Server**
```bash
# Compress the code (ignoring heavy node_modules)
tar -czf devops.tar.gz --exclude='.git' --exclude='node_modules' .

# Transfer securely to EC2
scp -i devops-key -o StrictHostKeyChecking=no devops.tar.gz ec2-user@<JENKINS_IP>:~/

# Extract on the server
ssh -i devops-key -o StrictHostKeyChecking=no ec2-user@<JENKINS_IP> 'mkdir -p ~/Devops && tar -xzf devops.tar.gz -C ~/Devops'
```

**Step 2: Authenticate, Build, and Push to ECR**
Execute this script to pass your local AWS authentication token securely to the remote server, build the images, and push them to ECR:
```bash
TOKEN=$(aws ecr get-login-password --region ap-south-1)

ssh -i devops-key -o StrictHostKeyChecking=no ec2-user@<JENKINS_IP> "
  echo ${TOKEN} | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com
  cd ~/Devops
  
  # Build & Push Backend
  docker build --no-cache -t commerce-backend:latest -f docker/Dockerfile.backend .
  docker tag commerce-backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/commerce-backend:latest
  docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/commerce-backend:latest
  
  # Build & Push Frontend
  docker build --no-cache -t commerce-frontend:latest -f docker/Dockerfile.frontend .
  docker tag commerce-frontend:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/commerce-frontend:latest
  docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/commerce-frontend:latest
"
```

---

## ☸️ 5. Deploying to Kubernetes (AWS EKS)

Once the infrastructure exists and the images are in ECR, the final step is Kubernetes orchestration.

**Step 1: Update the Database Secret**
Manually edit `kubernetes/db-secret.yaml` and inject the RDS Endpoint URL generated by Terraform in Step 3.
```yaml
# kubernetes/db-secret.yaml
stringData:
  url: "postgres://postgres:SecretPassword123!@<RDS_ENDPOINT_URL>:5432/commerce"
```

**Step 2: Authenticate and Apply**
```bash
# Point local kubectl to the new EKS cluster
aws eks update-kubeconfig --region ap-south-1 --name commerce-cluster

# Deploy Deployments, Services, Secrets, and HPAs
kubectl apply -f kubernetes/

# Trigger a rolling update to ensure pods pull the latest ECR images
kubectl rollout restart deployment backend frontend
```

**Step 3: Access the Live Application**
```bash
# Retrieve the external URL provisioned by the AWS Application Load Balancer
kubectl get svc frontend-service
```

---

## 🚨 6. Critical Troubleshooting & Debugging

During the deployment, two critical real-world issues were encountered and resolved. These are excellent debugging case studies to present during a viva.

### A. The IP Exhaustion Deadlock (AWS ENI Limit)
* **The Problem**: AWS Free Tier `t3.micro` EC2 instances have strict Elastic Network Interface (ENI) limits. They can only hold 4 IP addresses each. Because EKS defaults to a rolling update (creating new pods before terminating old ones), a deployment or rollout restart instantly exhausts the available IPs. Pods then hang indefinitely in a `Pending` state, causing a `502 Bad Gateway` or `ERR_EMPTY_RESPONSE` at the Load Balancer.
* **The Fix**: 
  1. Set the Horizontal Pod Autoscaler (HPA) `minReplicas` to `1` (configured in `kubernetes/hpa.yaml`) to prevent auto-scaling from forcing 2 replicas.
  2. Scale the deployments down to `0` to release all allocated node IPs.
  3. Force-terminate any stubborn pods, and then scale back up to `1` replica.

```bash
# 1. Scale down to 0 to release all IPs
kubectl scale deployment backend frontend --replicas=0

# 2. Force delete terminating pods to clear allocations immediately
kubectl delete pods --all --grace-period=0 --force

# 3. Verify namespace is clear
kubectl get pods

# 4. Scale back up to 1 replica (safe for t3.micro limits)
kubectl scale deployment backend frontend --replicas=1
```

### B. PostgreSQL SSL Connection Error (RDS Login Bug)
* **The Problem**: Attempting to log in or query products returned a `500 Server Error`. The logs reported `no pg_hba.conf entry for host "...", user "postgres", database "commerce", no encryption`. AWS RDS PostgreSQL requires SSL-encrypted connections by default, but the backend Node.js pg client was running in a development mode without SSL enabled.
* **The Fix**: Explicitly define `NODE_ENV: "production"` and `PORT: "5000"` in `kubernetes/backend-deployment.yaml`. This overrides any container `.env` configurations and forces the DB driver (`db.js`) to request a secure connection using `ssl: { rejectUnauthorized: false }`.


---

## 🔮 7. Recommendations & Future Enhancements

If asked by examiners what you would improve next, present these action items:

1. **Automate the Jenkins Pipeline**: We have a `Jenkinsfile` and the Jenkins server is provisioned, but the Docker build/push steps are currently manual. The next step is installing the Jenkins agent, configuring GitHub webhooks, and completely automating Step 4.
2. **Implement HashiCorp Vault Integration**: The `db-secret.yaml` is currently statically applied. We have provisioned a `Vault-Server` via Terraform, but the dynamic secret injection (so developers never see the DB password) still needs to be fully integrated into the Kubernetes pods.
3. **Migrate to Larger EC2 Instances**: To permanently solve the IP Exhaustion deadlock without manual scaling interventions, we should move the EKS worker nodes from `t3.micro` to `t3.small` or `t3.medium`, which support significantly more ENIs and IPs per node.
4. **Use Ingress Controllers instead of LoadBalancers**: Instead of a costly external LoadBalancer for the frontend service, we could deploy an NGINX Ingress Controller to route traffic more efficiently and handle SSL/TLS termination securely.
