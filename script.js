// Substitua pelo IP do seu ESP32 (ex: "192.168.1.100")
const ESP32_IP = "192.168.1.100"; // <-- MUDE ISSO PARA O IP DO SEU ESP32

// Função para enviar comandos para o ESP32
function cmd(led, action) {
    fetch(`http://${ESP32_IP}/${led}/${action}`)
        .then(response => response.json())
        .then(() => upd())
        .catch(error => console.error("Erro ao enviar comando:", error));
}

// Função para atualizar o status dos LEDs
function upd() {
    fetch(`http://${ESP32_IP}/status`)
        .then(response => response.json())
        .then(data => {
            // Atualiza LED 1 (Azul)
            const led1 = document.getElementById("led1");
            const led1s = document.getElementById("led1s");
            if (data.led1) {
                led1.classList.add("on-blue");
                led1.textContent = "ON";
                led1s.textContent = "LIGADO";
            } else {
                led1.classList.remove("on-blue");
                led1.textContent = "OFF";
                led1s.textContent = "DESLIGADO";
            }

            // Atualiza LED 2 (Laranja)
            const led2 = document.getElementById("led2");
            const led2s = document.getElementById("led2s");
            if (data.led2) {
                led2.classList.add("on-orange");
                led2.textContent = "ON";
                led2s.textContent = "LIGADO";
            } else {
                led2.classList.remove("on-orange");
                led2.textContent = "OFF";
                led2s.textContent = "DESLIGADO";
            }
        })
        .catch(error => console.error("Erro ao atualizar status:", error));
}

// Atualiza o status a cada 500ms
setInterval(upd, 500);
upd(); // Chama uma vez ao carregar a página
