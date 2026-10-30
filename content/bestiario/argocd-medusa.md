---
id: argocd-medusa
nombre: Medusa Sincronizadora
especie: Aurelia concordans
componente: ArgoCD
sector: colmena
estado: en_construccion
individuos: 1
sprite: argocd-medusa
hitbox: [40, 56]
comportamiento: flotar
estado_fotogenico: pulso_sincronizacion
rango_ideal: [48, 128]
radio_huida: 0
host: ???
relaciones: [talos-obrera, helm-cangrejo]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Herramienta GitOps elegida para el cluster Kubernetes. Instalación por confirmar.

## ★★
Sincroniza el cluster con un repositorio GitOps separado del de infraestructura: las aplicaciones de Kubernetes viven en ese repositorio, no en el de Terraform y Ansible.

- Estado de la instalación: ???
- Versión: ???

## ★★★
<!-- comandos, notas, decisiones -->

## Registro
> "Flota sobre la colmena. Todavía no sabe qué escuchar."
