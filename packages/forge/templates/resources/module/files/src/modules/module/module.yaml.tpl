name: {{kebabName}}
title: {{titleName}}
root: src/modules/{{kebabName}}
owner: platform-team
tags:
  - {{titleName}}
layers:
  controllers: controllers/**/*.ts
  services: services/**/*.ts
  repositories: repositories/**/*.ts
  schemas: schemas/**/*.ts
  tests: tests/**/*.ts
contracts:
  openapiTag: {{titleName}}
boundaries:
  owns:
    - {{camelName}}Controller
    - {{camelName}}Service
    - {{camelName}}Repository
  allows:
    imports:
      - core
