// Importar Firebase (usando la versión de compatibilidad)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js"
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js"

// Configuración de Firebase - Actualizada según tu imagen
const firebaseConfig = {
  apiKey: "AIzaSyDufDGMz4D_GulFqCI7kFHqQxOnOnAMlok",
  authDomain: "formulario-riesgos.firebaseapp.com",
  projectId: "formulario-riesgos",
  storageBucket: "formulario-riesgos.firebasestorage.app", // Usando el valor exacto de tu configuración
  messagingSenderId: "290768053678",
  appId: "1:290768053678:web:e28336011231e9d8ea943f",
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Referencia al servicio de almacenamiento
const storage = getStorage(app)

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

      if (actividad && actividad.value.trim() !== "") {
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
    return new Promise((resolve, reject) => {
      // Verificar si html2pdf está disponible
      if (typeof window.html2pdf === "undefined") {
        // Intentar cargar la librería dinámicamente si no está disponible
        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
        script.onload = () => {
          console.log("html2pdf cargado dinámicamente")
          generatePDFContent().then(resolve).catch(reject)
        }
        script.onerror = () => {
          reject(new Error("No se pudo cargar la librería html2pdf"))
        }
        document.head.appendChild(script)
      } else {
        generatePDFContent().then(resolve).catch(reject)
      }
    })

    async function generatePDFContent() {
      try {
        // Clonar el contenido del formulario para el PDF
        const content = document.getElementById("formContainer").cloneNode(true)

        // Eliminar elementos que no deben aparecer en el PDF
        const submitBtn = content.querySelector(".form-actions")
        if (submitBtn) submitBtn.remove()

        const loadingOverlay = content.querySelector("#loadingOverlay")
        if (loadingOverlay) loadingOverlay.remove()

        const successMessage = content.querySelector("#successMessage")
        if (successMessage) successMessage.remove()

        // Opciones para html2pdf
        const opt = {
          margin: 10,
          filename: "encuesta_riesgos_laborales.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        }

        console.log("Generando PDF...")
        const pdfBlob = await window.html2pdf().from(content).set(opt).outputPdf("blob")
        console.log("PDF generado correctamente")
        return pdfBlob
      } catch (error) {
        console.error("Error al generar PDF:", error)
        throw error
      }
    }
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
