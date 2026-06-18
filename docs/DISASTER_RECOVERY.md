# Disaster Recovery Plan

## Overview
This Disaster Recovery (DR) Plan details the protocols for responding to catastrophic failures in the Multi-Vendor Commerce Platform, ensuring business continuity with minimal downtime.

## Recovery Objectives
* **Recovery Time Objective (RTO)**: 1 Hour
* **Recovery Point Objective (RPO)**: 5 Minutes

---

## Disaster Scenarios, Commands & Protocols

### 1. Database Failure or Data Corruption
**Scenario**: The primary Amazon RDS PostgreSQL database crashes or becomes corrupted.

**Action Plan & Commands**:
1. Amazon RDS Automated Backups are configured with a 7-day retention period.
2. The DevOps team will initiate a point-in-time recovery (PITR) to restore the database to the minute before the corruption occurred:
   ```bash
   # Restore RDS instance to a new target instance name at a specific UTC time
   aws rds restore-db-instance-to-point-in-time \
       --source-db-instance-identifier commerce-db \
       --target-db-instance-identifier commerce-db-restored \
       --restore-time 2026-06-18T12:00:00Z \
       --db-instance-class db.t3.micro
   ```
3. Once the restored database is available, describe the instance endpoint:
   ```bash
   aws rds describe-db-instances \
       --db-instance-identifier commerce-db-restored \
       --query "DBInstances[0].Endpoint.Address" \
       --output text
   ```
4. Update the secrets inside HashiCorp Vault or edit the Kubernetes Secrets:
   ```bash
   # Base64 encode the new connection URL
   echo -n "postgres://postgres:PASSWORD@RESTORED_ENDPOINT_URL:5432/commerce" | base64
   
   # Apply updating secret configuration
   kubectl edit secret db-secret
   ```

---

### 2. EKS Cluster Region Outage
**Scenario**: The entire `ap-south-1` region goes offline, bringing down the Kubernetes cluster.

**Action Plan & Commands**:
1. The infrastructure is defined as code using Terraform.
2. Spin up an identical cluster in a secondary region (e.g., `us-east-1`):
   ```bash
   cd terraform
   
   # Apply with a modified region variable
   terraform apply \
       -var="region=us-east-1" \
       -var="db_password=MySecretPassword123" \
       -auto-approve
   ```
3. Authenticate with the new EKS cluster:
   ```bash
   aws eks update-kubeconfig --region us-east-1 --name commerce-cluster
   ```
4. Trigger the deployment manifest update:
   ```bash
   kubectl apply -f kubernetes/
   ```
5. Update DNS/Route53 to route traffic to the newly created Application Load Balancer:
   ```bash
   # Retrieve new ELB URL
   kubectl get svc frontend-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
   ```

---

### 3. CI/CD Jenkins Server Crash
**Scenario**: The EC2 instance running Jenkins crashes and the volume is lost.

**Action Plan & Commands**:
1. Re-provision the Jenkins EC2 instance using Terraform:
   ```bash
   cd terraform
   terraform target aws_instance.jenkins
   terraform apply -var="db_password=MySecretPassword" -auto-approve
   ```
2. Verify connection to the new instance:
   ```bash
   # Retrieve public IP
   JENKINS_IP=$(terraform output -raw jenkins_public_ip)
   ssh -i devops-key.pem ec2-user@$JENKINS_IP
   ```
3. Run the bootstrap scripts to install Jenkins and Docker:
   ```bash
   sudo yum update -y
   sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
   sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
   sudo yum install jenkins java-17-amazon-corretto-devel docker git -y
   sudo systemctl enable --now jenkins docker
   sudo usermod -aG docker jenkins && sudo systemctl restart jenkins
   ```
4. Re-configure the Webhook triggers inside the GitHub repository Settings to target the new Jenkins IP.

---

### 4. Application Pod Failure (OOM / Load Spike)
**Scenario**: Heavy traffic causes the frontend or backend pods to crash.

**Action Plan & Commands**:
1. Fetch current pods and restart counts:
   ```bash
   kubectl get pods -o wide
   ```
2. Describe the crashed pod to verify the exit status code (e.g., `OOMKilled`):
   ```bash
   kubectl describe pod <pod_name>
   ```
3. Check pod logs for exceptions:
   ```bash
   kubectl logs <pod_name> --previous
   ```
4. Temporarily scale the deployment manually to match load:
   ```bash
   kubectl scale deployment backend --replicas=5
   ```
5. If traffic sustains, check the Autoscaler status:
   ```bash
   kubectl get hpa backend-hpa
   ```
