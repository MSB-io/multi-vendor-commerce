resource "aws_db_subnet_group" "default" {
  name       = "commerce-db-subnet-group"
  subnet_ids = module.vpc.public_subnets

  tags = {
    Name = "commerce-db-subnet-group"
  }
}

resource "aws_db_instance" "default" {
  allocated_storage    = 20
  db_name              = "commerce"
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = "db.t3.micro"
  username             = "postgres"
  password             = var.db_password
  parameter_group_name = "default.postgres15"
  skip_final_snapshot  = true
  publicly_accessible  = true
  db_subnet_group_name = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.allow_all.id]
}
