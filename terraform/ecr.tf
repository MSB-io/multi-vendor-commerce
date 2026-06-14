resource "aws_ecr_repository" "backend" {
  name                 = "commerce-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

resource "aws_ecr_repository" "frontend" {
  name                 = "commerce-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}
