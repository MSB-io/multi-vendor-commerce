variable "region" {
  description = "AWS Region"
  default     = "ap-south-1"
}

variable "db_password" {
  description = "Password for the RDS instance"
  type        = string
  sensitive   = true
}

variable "key_name" {
  description = "Name of the SSH key pair"
  type        = string
  default     = "devops-key"
}
