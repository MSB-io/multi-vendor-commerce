data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

resource "aws_instance" "jenkins" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "t2.medium"
  subnet_id     = module.vpc.public_subnets[0]
  vpc_security_group_ids = [aws_security_group.allow_all.id]
  key_name      = var.key_name

  associate_public_ip_address = true

  tags = {
    Name = "Jenkins-Server"
  }
}

resource "aws_instance" "vault" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "t2.micro"
  subnet_id     = module.vpc.public_subnets[0]
  vpc_security_group_ids = [aws_security_group.allow_all.id]
  key_name      = var.key_name

  associate_public_ip_address = true

  tags = {
    Name = "Vault-Server"
  }
}
