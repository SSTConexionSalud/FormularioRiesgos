// Importar Firebase (asumiendo que se usa la versión modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.2.0/firebase-app.js"
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.2.0/firebase-storage.js"

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID",
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Referencia al servicio de almacenamiento
const storage = getStorage(app)

// Importar html2pdf (asumiendo que se usa desde un CDN o similar)
import * as html2pdf from "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("riskForm")
  const submitBtn = document.getElementById("submitBtn")
  const loadingOverlay = document.getElementById("loadingOverlay")
  const successMessage = document.getElementById("successMessage")
  const closeSuccessBtn = document.getElementById("closeSuccessBtn")

  // Establecer la fecha actual en el campo de fecha
  const fechaInput = document.getElementById("fecha")
  if (fechaInput) {
    const today = new Date().toISOString().split("T")[0]
    fechaInput.value = today
  }

  // Cerrar mensaje de éxito
  closeSuccessBtn.addEventListener("click", () => {
    successMessage.style.display = "none"
  })

  submitBtn.addEventListener("click", async () => {
    // Validar el formulario
    if (!validateForm()) {
      alert("Por favor complete todos los campos obligatorios y seleccione al menos una opción para cada actividad.")
      return
    }

    // Mostrar pantalla de carga
    loadingOverlay.style.display = "flex"

    try {
      // Generar PDF
      const pdfBlob = await generatePDF()

      // Subir a Firebase Storage
      await uploadToFirebase(pdfBlob)

      // Mostrar mensaje de éxito
      loadingOverlay.style.display = "none"
      successMessage.style.display = "block"

      // Descargar el PDF localmente también
      downloadPDF(pdfBlob)
    } catch (error) {
      loadingOverlay.style.display = "none"
      alert("Error al procesar el formulario: " + error.message)
      console.error(error)
    }
  })

  function validateForm() {
    // Validar campos personales
    const requiredFields = [
      "encuestador",
      "trabajador",
      "proceso",
      "cargo",
      "lugar",
      "horas",
      "fecha",
      "email",
      "telefono",
    ]
    for (const field of requiredFields) {
      const input = document.getElementById(field)
      if (!input.value.trim()) {
        return false
      }
    }

    // Validar que al menos una actividad tenga datos
    let actividadCompleta = false
    for (let i = 1; i <= 10; i++) {
      const actividad = document.querySelector(`input[name="actividad_${i}"]`)
      const rutinariaSi = document.querySelector(`input[name="rutinaria_${i}"][value="SI"]`)
      const rutinariaNo = document.querySelector(`input[name="rutinaria_${i}"][value="NO"]`)
      const peligrosaSi = document.querySelector(`input[name="peligrosa_${i}"][value="SI"]`)
      const peligrosaNo = document.querySelector(`input[name="peligrosa_${i}"][value="NO"]`)

      if (actividad.value.trim() !== "") {
        if ((rutinariaSi && rutinariaSi.checked) || (rutinariaNo && rutinariaNo.checked)) {
          if ((peligrosaSi && peligrosaSi.checked) || (peligrosaNo && peligrosaNo.checked)) {
            actividadCompleta = true
            break
          }
        }
      }
    }

    if (!actividadCompleta) {
      return false
    }

    return true
  }

  async function generatePDF() {
    // Clonar el contenido del formulario para el PDF
    const content = document.getElementById("formContainer").cloneNode(true)

    // Eliminar elementos que no deben aparecer en el PDF
    const submitBtn = content.querySelector("#submitBtn")
    if (submitBtn) submitBtn.parentNode.removeChild(submitBtn)

    // Opciones para html2pdf
    const opt = {
      margin: 10,
      filename: "encuesta_riesgos_laborales.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }

    // Generar el PDF
    const pdfBlob = await html2pdf().from(content).set(opt).outputPdf("blob")
    return pdfBlob
  }

  function downloadPDF(pdfBlob) {
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = "encuesta_riesgos_laborales.pdf"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function uploadToFirebase(pdfBlob) {
    // Obtener datos del formulario para el nombre del archivo
    const trabajador = document.getElementById("trabajador").value
    const fecha = document.getElementById("fecha").value
    const fileName = `Encuesta_Riesgos_${trabajador}_${fecha}.pdf`

    // Crear una referencia al archivo en Firebase Storage
    const storageRef = ref(storage, `formularios/${fileName}`)

    try {
      // Subir el archivo
      await uploadBytes(storageRef, pdfBlob)
      console.log("Archivo subido a Firebase Storage")

      // Obtener la URL de descarga (opcional)
      const downloadURL = await getDownloadURL(storageRef)
      console.log("URL de descarga:", downloadURL)

      return downloadURL
    } catch (error) {
      console.error("Error al subir archivo a Firebase:", error)
      throw error
    }
  }
})
