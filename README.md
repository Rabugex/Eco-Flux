# EcoFlux - Controle de LEDs do ESP32

Este é um site estático para controlar os LEDs do ESP32 (GPIO 2 e GPIO 21) via interface web.
O site é hospedado no **GitHub Pages**, mas interage com o ESP32 via requisições HTTP.

---

## 📌 Como Usar

### 1. Configurar o ESP32
1. Faça o upload do código do ESP32 (com as rotas `/led1/on`, `/led1/off`, etc.).
2. Anote o **IP do ESP32** (exibido no Serial Monitor).

### 2. Configurar o Site
1. No arquivo [`script.js`](script.js), atualize a variável `ESP32_IP` com o IP do seu ESP32:
   ```javascript
   const ESP32_IP = "192.168.1.100"; // Substitua pelo IP do seu ESP32
