---
id: tailscale-polilla
nombre: Polilla de Fase
especie: Phalaena reticulata
componente: Tailscale (LXC)
sector: muelle
estado: confirmado
individuos: 1
sprite: tailscale-polilla
hitbox: [24, 20]
comportamiento: fase
estado_fotogenico: salto_fase
rango_ideal: [32, 96]
radio_huida: 0
host: titan-proxmox
relaciones: [titan-proxmox]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Acceso remoto privado a la red del homelab desde fuera de casa.

## ★★
Contenedor LXC que funciona como **subnet router**: publica la red local en la tailnet. Lo crea Terraform, pero la instalación de Tailscale y el acceso a TUN se hacen a mano.

Tailscale necesita `/dev/net/tun`. Proxmox solo permite configurar dispositivos a `root@pam` y Terraform usa un API token, así que ese paso es manual en el nodo. **Si el contenedor se recrea, hay que repetirlo.**

## ★★★
La ruta publicada hay que aprobarla en la consola de Tailscale (**Machines → Edit route settings**).

En el cliente Linux hay que aceptar las rutas explícitamente:

```bash
sudo tailscale up --accept-routes
```

## Registro
> "Solo se deja ver por quien ya la conoce."
