# Disaster Recovery Plan

## Overview
This Disaster Recovery (DR) Plan details the protocols for responding to catastrophic failures in the Multi-Vendor Commerce Platform, ensuring business continuity with minimal downtime.

## Recovery Objectives
- **Recovery Time Objective (RTO)**: 1 Hour
- **Recovery Point Objective (RPO)**: 5 Minutes

## Disaster Scenarios and Protocols

### 1. Database Failure or Data Corruption
**Scenario**: The primary Amazon RDS PostgreSQL database crashes or becomes corrupted.
**Action Plan**:
1. Amazon RDS Automated Backups are configured with a 7-day retention period.
2. The DevOps team will initiate a point-in-time recovery (PITR) to restore the database to the minute before the corruption occurred.
3. Update the backend Kubernetes secrets (stored securely in Vault) if the database endpoint changes.

### 2. EKS Cluster Region Outage
**Scenario**: The entire `ap-south-1` region goes offline, bringing down the Kubernetes cluster.
**Action Plan**:
1. The infrastructure is defined as code using Terraform.
2. The DevOps admin triggers the `terraform apply` pipeline to spin up an identical cluster in a secondary region (e.g., `us-east-1`).
3. Jenkins pipeline automatically re-deploys the frontend and backend applications from the ECR registry to the new cluster.
4. Update DNS/Route53 to point to the new Application Load Balancer.

### 3. CI/CD Jenkins Server Crash
**Scenario**: The EC2 instance running Jenkins crashes and the volume is lost.
**Action Plan**:
1. Jenkins configurations, plugins, and jobs are stored as code (Jenkinsfile).
2. Terraform is used to spin up a replacement EC2 instance.
3. A bootstrap script installs Jenkins and reconnects it to the GitHub repository webhook.

### 4. Application Pod Failure
**Scenario**: Heavy traffic causes the frontend or backend pods to crash (Out Of Memory).
**Action Plan**:
1. Kubernetes ReplicaSets automatically detect the failed pods via Readiness and Liveness probes.
2. Pods are automatically restarted within seconds.
3. If traffic sustains, the Horizontal Pod Autoscaler (HPA) automatically provisions additional replicas until the load stabilizes.
