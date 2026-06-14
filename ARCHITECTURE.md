# Multi-Vendor Commerce Platform - Architecture

This document describes the high-level architecture of the Multi-Vendor Commerce Platform.

## Architecture Diagram

```mermaid
graph TD
    subgraph "AWS Cloud (ap-south-1)"
        subgraph "Public Subnet"
            IGW[Internet Gateway]
            Jenkins[Jenkins CI/CD Server<br>t3.micro]
            Vault[HashiCorp Vault Server<br>t3.micro]
            ALB[Application Load Balancer]
        end

        subgraph "Private Subnet"
            subgraph "EKS Cluster (commerce-cluster)"
                Frontend[React Frontend Pods<br>Nginx]
                Backend[Node.js Backend Pods<br>Express API]
            end
            
            RDS[(Amazon RDS<br>PostgreSQL)]
        end
        
        ECR[Amazon ECR<br>Docker Registries]
    end

    User((User/Browser)) --> |HTTP/HTTPS| ALB
    ALB --> |Port 80| Frontend
    Frontend --> |/api/| Backend
    Backend --> |TCP 5432| RDS
    
    Jenkins --> |Docker Push| ECR
    Jenkins --> |kubectl apply| EKS
    
    Developer((Developer)) --> |Git Push| GitHub[GitHub Repo]
    GitHub --> |Webhook trigger| Jenkins
```

## Component Breakdown

1. **Frontend**: React application built with Vite and TailwindCSS, served by an Nginx container. Deployed to EKS as a highly available Deployment.
2. **Backend**: Node.js/Express REST API. Connects to RDS PostgreSQL. Deployed to EKS.
3. **Database**: Amazon RDS (PostgreSQL) in a private subnet for security.
4. **CI/CD**: Jenkins server running on a dedicated EC2 instance. Polls GitHub, builds Docker images, pushes to Amazon ECR, and deploys YAML manifests to EKS.
5. **Secret Management**: HashiCorp Vault securely stores and manages sensitive credentials like the RDS database passwords.
6. **Monitoring & Logging**: Prometheus & Grafana are used for cluster metrics, while the ELK stack handles centralized logging.
