// -------------------------------------------------------------------
// Solicitar permiso de notificaciones (una sola vez al cargar la página)
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(permission => {
      console.log("Permiso de notificación:", permission);
    });
  }
});

// -------------------------------------------------------------------
// Configuración de Blynk IoT
// -------------------------------------------------------------------
const AUTH_TOKEN = "TU_AUTH_TOKEN";  // Reemplaza este valor con tu Auth Token real
const PIN_LLAMADA = "V1";            // Sensor de llama (analógico: 0 a 1023)
const PIN_HUMO   = "V2";             // Sensor de humo (digital: 1 o 0)
const URL_BLYNK = "https://blynk.cloud/external/api/get";

// Variables globales para controlar notificaciones y estado
let ultimoNivelNotificado = "Normal";
let ultimoEstadoHumo = 1; // 1: normal, 0: detección
let nivelRiesgo = "Normal"; // Nivel actual derivado del sensor de llama

// -------------------------------------------------------------------
// Función para enviar notificaciones (sin solicitar permiso repetidamente)
// -------------------------------------------------------------------
function enviarNotificacion(mensaje) {
  if (!("Notification" in window)) {
    console.log("Este navegador no soporta notificaciones.");
    return;
  }
  if (Notification.permission === "granted") {
    new Notification(mensaje);
  }
}

// -------------------------------------------------------------------
// Función para obtener datos desde Blynk
// -------------------------------------------------------------------
async function obtenerDato(pin) {
  const url = `${URL_BLYNK}?token=${AUTH_TOKEN}&pin=${pin}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error en la petición: ${response.status}`);
    }
    const dato = await response.text();
    return Number(dato);
  } catch (error) {
    console.error("Error al obtener datos para", pin, error);
    return null;
  }
}

// -------------------------------------------------------------------
// Función para actualizar la barra vertical de riesgo (sensor de llama)
// -------------------------------------------------------------------
function actualizarBarra(valor) {
  let porcentaje = (valor / 1023) * 100;
  
  // Determinar niveles y colores:
  // Normal: valor ≥ 700 → verde
  // Riesgo Moderado: 700 > valor ≥ 500 → amarillo
  // Riesgo Alto: 500 > valor ≥ 200 → naranja
  // Riesgo Muy Alto: valor < 200 → rojo
  let color, nivel;
  if (valor < 200) {
    color = "red";
    nivel = "Riesgo Muy Alto";
  } else if (valor < 500) {
    color = "orange";
    nivel = "Riesgo Alto";
  } else if (valor < 700) {
    color = "yellow";
    nivel = "Riesgo Moderado";
  } else {
    color = "green";
    nivel = "Normal";
  }
  
  // Actualizar la variable global con el nivel actual
  nivelRiesgo = nivel;
  
  const barra = document.getElementById("barra-sensor");
  barra.style.height = porcentaje + "%";
  barra.style.backgroundColor = color;
  
  // Enviar notificación si el nivel cambia (y no es Normal)
  if (nivel !== ultimoNivelNotificado && nivel !== "Normal") {
    let mensajeNotificacion = "";
    if (nivel === "Riesgo Muy Alto") {
      mensajeNotificacion = "ALERTA ROJA: ¡Posible incendio detectado! (Riesgo Muy Alto)";
    } else if (nivel === "Riesgo Alto") {
      mensajeNotificacion = "Alerta Naranja: Riesgo Alto, revise el sensor de llama.";
    } else if (nivel === "Riesgo Moderado") {
      mensajeNotificacion = "Alerta Amarilla: Riesgo Moderado, vigile el sensor de llama.";
    }
    enviarNotificacion(mensajeNotificacion);
    ultimoNivelNotificado = nivel;
  }
  
  if (nivel === "Normal") {
    ultimoNivelNotificado = "Normal";
  }
}

// -------------------------------------------------------------------
// Función para actualizar el logo del árbol según sensor de humo y riesgo
// -------------------------------------------------------------------
function actualizarLogoArbol(valorHumo) {
  const logo = document.getElementById("logoArbol");
  const mensaje = document.getElementById("mensajeHumo");
  
  // Prioridad: Si el riesgo (valor del sensor de llama) es "Riesgo Muy Alto", mostrar árbol con fuego.
  if (nivelRiesgo === "Riesgo Muy Alto") {
    logo.src = `arbol_con_fuego.png?timestamp=${new Date().getTime()}`; // Forzamos recarga
    mensaje.textContent = "¡Incendio inminente!";
    mensaje.style.color = "red";
  }
  // Si no, si el sensor de humo detecta 0, mostrar árbol con humo.
  else if (valorHumo === 0) {
    logo.src = `arbol_con_humo.png?timestamp=${new Date().getTime()}`; // Forzamos recarga
    mensaje.textContent = "Humo detectado, posible incendio";
    mensaje.style.color = "red";
  }
  else {
    logo.src = `arbol.png?timestamp=${new Date().getTime()}`; // Forzamos recarga
    mensaje.textContent = "";
  }
  ultimoEstadoHumo = valorHumo;
}

// -------------------------------------------------------------------
// Función principal para actualizar la interfaz (barra y logo)
// -------------------------------------------------------------------
async function actualizarDatos() {
  const valorLlama = await obtenerDato(PIN_LLAMADA);
  const valorHumo = await obtenerDato(PIN_HUMO);
  
  if (valorLlama !== null) {
    actualizarBarra(valorLlama);
  }
  if (valorHumo !== null) {
    actualizarLogoArbol(valorHumo);
  }
}

// -------------------------------------------------------------------
// Actualizar datos cada 5 segundos y llamada inicial
// -------------------------------------------------------------------
setInterval(actualizarDatos, 5000);
actualizarDatos();