// Importar Firebase (usando la versión de compatibilidad)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js"
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js"

// Configuración de Firebase - Corregida
const firebaseConfig = {
  apiKey: "AIzaSyDufDGMz4D_GulFqCI7kFHqQxOnOnAMlok",
  authDomain: "formulario-riesgos.firebaseapp.com",
  projectId: "formulario-riesgos",
  storageBucket: "formulario-riesgos.appspot.com", // Corregido a formato estándar de Firebase
  messagingSenderId: "290768053678",
  appId: "1:290768053678:web:e28336011231e9d8ea943f",
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Referencia al servicio de almacenamiento
const storage = getStorage(app)

document.addEventListener("DOMContentLoaded", () => {
  // Verificar si html2pdf está disponible
  if (typeof window.html2pdf === "undefined") {
    console.error("html2pdf no está disponible. Cargando manualmente...")

    // Cargar html2pdf manualmente
    const script = document.createElement("script")
    script.src = "https://raw.githack.com/eKoopmans/html2pdf/master/dist/html2pdf.bundle.min.js"
    script.onload = () => {
      console.log("html2pdf cargado correctamente")
      inicializarFormulario()
    }
    script.onerror = () => {
      alert("Error al cargar html2pdf. Por favor, recargue la página o contacte al administrador.")
      console.error("Error al cargar html2pdf")
    }
    document.head.appendChild(script)
  } else {
    console.log("html2pdf ya está disponible")
    inicializarFormulario()
  }

  function inicializarFormulario() {
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
        // Método alternativo: Usar jsPDF directamente si html2pdf falla
        let pdfBlob

        try {
          // Intentar con html2pdf primero
          pdfBlob = await generatePDFWithHtml2pdf()
          console.log("PDF generado con html2pdf")
        } catch (html2pdfError) {
          console.error("Error con html2pdf:", html2pdfError)
          alert("Error al generar el PDF. Por favor, intente nuevamente.")
          loadingOverlay.style.display = "none"
          return
        }

        // Subir a Firebase Storage
        try {
          await uploadToFirebase(pdfBlob)
          console.log("PDF subido a Firebase correctamente")

          // Mostrar mensaje de éxito
          loadingOverlay.style.display = "none"
          successMessage.style.display = "block"

          // Descargar el PDF localmente también
          downloadPDF(pdfBlob)
        } catch (uploadError) {
          console.error("Error al subir a Firebase:", uploadError)
          alert("Error al subir el formulario a Firebase: " + uploadError.message)
          loadingOverlay.style.display = "none"
        }
      } catch (error) {
        console.error("Error general:", error)
        loadingOverlay.style.display = "none"
        alert("Error al procesar el formulario: " + error.message)
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

    async function generatePDFWithHtml2pdf() {
      return new Promise((resolve, reject) => {
        try {
          // Verificar nuevamente si html2pdf está disponible
          if (typeof window.html2pdf === "undefined") {
            reject(new Error("html2pdf no está disponible"))
            return
          }

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

          // Generar el PDF
          window
            .html2pdf()
            .from(content)
            .set(opt)
            .outputPdf("blob")
            .then((blob) => {
              console.log("PDF generado correctamente")
              resolve(blob)
            })
            .catch((error) => {
              console.error("Error en html2pdf.outputPdf:", error)
              reject(error)
            })
        } catch (error) {
          console.error("Error en generatePDFWithHtml2pdf:", error)
          reject(error)
        }
      })
    }

    function downloadPDF(pdfBlob) {
      try {
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement("a")
        a.href = url
        a.download = "encuesta_riesgos_laborales.pdf"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error("Error al descargar PDF:", error)
      }
    }

    async function uploadToFirebase(pdfBlob) {
      // Obtener datos del formulario para el nombre del archivo
      const trabajador = document.getElementById("trabajador").value
      const fecha = document.getElementById("fecha").value
      const fileName = `Encuesta_Riesgos_${trabajador}_${fecha}.pdf`

      console.log("Subiendo archivo a Firebase Storage:", fileName)
      console.log("Storage bucket:", firebaseConfig.storageBucket)

      // Crear una referencia al archivo en Firebase Storage
      const storageRef = ref(storage, `formularios/${fileName}`)

      try {
        // Subir el archivo
        const snapshot = await uploadBytes(storageRef, pdfBlob)
        console.log("Archivo subido a Firebase Storage:", snapshot)

        // Obtener la URL de descarga
        const downloadURL = await getDownloadURL(storageRef)
        console.log("URL de descarga:", downloadURL)

        return downloadURL
      } catch (error) {
        console.error("Error al subir archivo a Firebase:", error)
        console.error("Detalles del error:", error.code, error.message)
        throw error
      }
    }
  }
})
