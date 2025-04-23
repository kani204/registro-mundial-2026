// variables para la base de datos
let db;
const nombreBaseDeDatos = "mundial2026";
const versionBaseDeDatos = 1;
const nombreTablaEquipos = "equipos";

// elementos del dom que vamos a usar
const formularioRegistro = document.getElementById("formulario-registro");
const contenedorFormulario = document.getElementById("contenedor-formulario");
const contenedorTabla = document.getElementById("contenedor-tabla");
const cuerpoTablaEquipos = document.getElementById("cuerpo-tabla-equipos");
const botonNuevoEquipo = document.getElementById("boton-nuevo-equipo");
const botonCancelar = document.getElementById("boton-cancelar");
const botonGuardar = document.getElementById("boton-guardar");
const inputIdEquipo = document.getElementById("id-equipo");
const filtroConfederacion = document.getElementById("filtro-confederacion");
const filtroGrupo = document.getElementById("filtro-grupo");
const listaEquiposPorConfederacion = document.getElementById("lista-equipos-por-confederacion");
const promedioParticipacionesElemento = document.getElementById("promedio-participaciones");
const listaCampeones = document.getElementById("lista-campeones");
const botonModoOscuro = document.getElementById("boton-modo-oscuro");
const busquedaPaisInput = document.getElementById("busqueda-pais");
let modoOscuroActivado = localStorage.getItem('modoOscuro') === 'true' || false;

// al cargar la página, aplicamos el modo oscuro si estaba activado
if (modoOscuroActivado) {
    document.body.classList.add("modo-oscuro");
}

// cuando la pagina carga, inicializamos todo
document.addEventListener("DOMContentLoaded", () => {
    // verificamos si el navegador soporta indexeddb
    if (!window.indexedDB) {
        alert("tu navegador no soporta indexeddb. la app no va a funcionar bien.");
        return;
    }

    // abrimos o creamos la base de datos
    const request = indexedDB.open(nombreBaseDeDatos, versionBaseDeDatos);

    request.onerror = (evento) => {
        console.error("error al abrir la base de datos:", evento.target.error);
        alert("hubo un error al abrir la base de datos. recargá la página por favor.");
    };

    request.onsuccess = (evento) => {
        db = evento.target.result;
        console.log("base de datos abierta con éxito");
        mostrarEquipos();
        actualizarEstadisticas();
    };

    request.onupgradeneeded = (evento) => {
        const db = evento.target.result;

        // creamos la tabla de equipos si no existe
        if (!db.objectStoreNames.contains(nombreTablaEquipos)) {
            const tablaEquipos = db.createObjectStore(nombreTablaEquipos, { keyPath: "id", autoIncrement: true });
            tablaEquipos.createIndex("nombrePais", "nombrePais", { unique: false });
            tablaEquipos.createIndex("confederacion", "confederacion", { unique: false });
            tablaEquipos.createIndex("grupo", "grupo", { unique: false });
            tablaEquipos.createIndex("mejorResultado", "mejorResultado", { unique: false });
            console.log("tabla de equipos creada");
        }
    };

    // eventos de los botones y filtros
    botonNuevoEquipo.addEventListener("click", mostrarFormulario);
    botonCancelar.addEventListener("click", ocultarFormulario);
    formularioRegistro.addEventListener("submit", guardarEquipo);
    filtroConfederacion.addEventListener("change", mostrarEquiposFiltrados);
    filtroGrupo.addEventListener("change", mostrarEquiposFiltrados);
    botonModoOscuro.addEventListener("click", () => {
        document.body.classList.toggle("modo-oscuro");
        modoOscuroActivado = !modoOscuroActivado;
        localStorage.setItem('modoOscuro', modoOscuroActivado);
    });
    busquedaPaisInput.addEventListener("input", mostrarEquiposFiltrados);
});

// muestra el formulario para agregar/editar equipos
function mostrarFormulario() {
    contenedorFormulario.style.display = "block";
    contenedorTabla.style.display = "none";
    formularioRegistro.reset();
    inputIdEquipo.value = ""; // limpiamos el id para un nuevo registro
}

// oculta el formulario
function ocultarFormulario() {
    contenedorFormulario.style.display = "none";
    contenedorTabla.style.display = "block";
}

// guarda un equipo en la base de datos (nuevo o editado)
function guardarEquipo(evento) {
    evento.preventDefault();

    const nombrePais = document.getElementById("nombre-pais").value.trim();
    const confederacion = document.getElementById("confederacion").value;
    const grupo = document.getElementById("grupo").value;
    const entrenador = document.getElementById("entrenador").value.trim();
    const anioParticipacion = document.getElementById("anio-participacion").value;
    const cantidadParticipaciones = document.getElementById("cantidad-participaciones").value;
    const mejorResultado = document.getElementById("mejor-resultado").value;
    const escudoUrl = document.getElementById("escudo-url").value.trim();
    const banderaUrl = document.getElementById("bandera-url").value.trim();
    const idEquipo = inputIdEquipo.value;

    // validacion basica (podriamos agregar mas)
    if (!nombrePais || !entrenador) {
        alert("por favor, completá el nombre del país y el entrenador.");
        return;
    }

    const equipo = {
        nombrePais: nombrePais,
        confederacion: confederacion,
        grupo: grupo,
        entrenador: entrenador,
        anioParticipacion: anioParticipacion ? parseInt(anioParticipacion) : null,
        cantidadParticipaciones: cantidadParticipaciones ? parseInt(cantidadParticipaciones) : null,
        mejorResultado: mejorResultado,
        escudoUrl: escudoUrl,
        banderaUrl: banderaUrl
    };

    // iniciamos una transaccion para escribir en la base de datos
    const transaccion = db.transaction([nombreTablaEquipos], "readwrite");
    const tabla = transaccion.objectStore(nombreTablaEquipos);
    const operacion = idEquipo ? tabla.put({ ...equipo, id: parseInt(idEquipo) }) : tabla.add(equipo);

    operacion.onsuccess = () => {
        console.log(idEquipo ? "equipo actualizado" : "equipo agregado");
        ocultarFormulario();
        mostrarEquipos();
        actualizarEstadisticas();
    };

    operacion.onerror = (evento) => {
        console.error("error al guardar el equipo:", evento.target.error);
        alert("hubo un error al guardar el equipo. intentá de nuevo.");
    };
}

// muestra todos los equipos o los filtrados segun los selectores Y la búsqueda
function mostrarEquiposFiltrados() {
    const confederacionSeleccionada = filtroConfederacion.value;
    const grupoSeleccionado = filtroGrupo.value;
    const textoBusqueda = busquedaPaisInput.value.trim().toLowerCase();

    const transaccion = db.transaction([nombreTablaEquipos], "readonly");
    const tabla = transaccion.objectStore(nombreTablaEquipos);
    const todosLosEquipos = [];

    tabla.openCursor().onsuccess = (evento) => {
        const cursor = evento.target.result;
        if (cursor) {
            todosLosEquipos.push(cursor.value);
            cursor.continue();
        } else {
            let equiposFiltrados = todosLosEquipos;

            if (confederacionSeleccionada) {
                equiposFiltrados = equiposFiltrados.filter(equipo => equipo.confederacion === confederacionSeleccionada);
            }

            if (grupoSeleccionado) {
                equiposFiltrados = equiposFiltrados.filter(equipo => equipo.grupo === grupoSeleccionado);
            }

            if (textoBusqueda) {
                equiposFiltrados = equiposFiltrados.filter(equipo =>
                    equipo.nombrePais.toLowerCase().includes(textoBusqueda)
                );
            }

            renderizarTabla(equiposFiltrados);
        }
    };
}

// muestra todos los equipos en la tabla
function mostrarEquipos() {
    const transaccion = db.transaction([nombreTablaEquipos], "readonly");
    const tabla = transaccion.objectStore(nombreTablaEquipos);
    const request = tabla.getAll();

    request.onsuccess = (evento) => {
        renderizarTabla(evento.target.result);
    };

    request.onerror = (evento) => {
        console.error("error al obtener los equipos:", evento.target.error);
    };
}

// dibuja la tabla de equipos en la pantalla
function renderizarTabla(equipos) {
    cuerpoTablaEquipos.innerHTML = ""; // limpiamos la tabla

    if (equipos.length === 0) {
        const fila = cuerpoTablaEquipos.insertRow();
        const celda = fila.insertCell();
        celda.colSpan = 8;
        celda.textContent = "no hay equipos registrados.";
        return;
    }

    equipos.forEach(equipo => {
        const fila = cuerpoTablaEquipos.insertRow();

        const celdaNombre = fila.insertCell();
        celdaNombre.textContent = equipo.nombrePais;

        const celdaConfederacion = fila.insertCell();
        celdaConfederacion.textContent = equipo.confederacion;

        const celdaGrupo = fila.insertCell();
        celdaGrupo.textContent = equipo.grupo;

        const celdaEntrenador = fila.insertCell();
        celdaEntrenador.textContent = equipo.entrenador;

        const celdaAnio = fila.insertCell();
        celdaAnio.textContent = equipo.anioParticipacion || "-";

        const celdaParticipaciones = fila.insertCell();
        celdaParticipaciones.textContent = equipo.cantidadParticipaciones || "-";

        const celdaResultado = fila.insertCell();
        celdaResultado.textContent = equipo.mejorResultado || "-";

        const celdaAcciones = fila.insertCell();
        celdaAcciones.classList.add("acciones-tabla");

        const botonEditar = document.createElement("button");
        botonEditar.textContent = "editar";
        botonEditar.addEventListener("click", () => editarEquipo(equipo.id));
        celdaAcciones.appendChild(botonEditar);

        const botonEliminar = document.createElement("button");
        botonEliminar.textContent = "eliminar";
        botonEliminar.classList.add("eliminar");
        botonEliminar.addEventListener("click", () => eliminarEquipo(equipo.id));
        celdaAcciones.appendChild(botonEliminar);
    });
}

// busca los datos de un equipo para editar
function editarEquipo(id) {
    const transaccion = db.transaction([nombreTablaEquipos], "readonly");
    const tabla = transaccion.objectStore(nombreTablaEquipos);
    const request = tabla.get(id);

    request.onsuccess = (evento) => {
        const equipo = evento.target.result;
        if (equipo) {
            inputIdEquipo.value = equipo.id;
            document.getElementById("nombre-pais").value = equipo.nombrePais;
            document.getElementById("confederacion").value = equipo.confederacion;
            document.getElementById("grupo").value = equipo.grupo;
            document.getElementById("entrenador").value = equipo.entrenador;
            document.getElementById("anio-participacion").value = equipo.anioParticipacion || "";
            document.getElementById("cantidad-participaciones").value = equipo.cantidadParticipaciones || "";
            document.getElementById("mejor-resultado").value = equipo.mejorResultado;
            document.getElementById("escudo-url").value = equipo.escudoUrl || "";
            document.getElementById("bandera-url").value = equipo.banderaUrl || "";
            mostrarFormulario();
        } else {
            alert("no se encontró el equipo para editar.");
        }
    };

    request.onerror = (evento) => {
        console.error("error al buscar el equipo:", evento.target.error);
    };
}

// elimina un equipo de la base de datos
function eliminarEquipo(id) {
    if (confirm("¿seguro que querés eliminar este equipo?")) {
        const transaccion = db.transaction([nombreTablaEquipos], "readwrite");
        const tabla = transaccion.objectStore(nombreTablaEquipos);
        const request = tabla.delete(id);

        request.onsuccess = () => {
            console.log("equipo eliminado");
            mostrarEquipos();
            actualizarEstadisticas();
        };

        request.onerror = (evento) => {
            console.error("error al eliminar el equipo:", evento.target.error);
            alert("hubo un error al eliminar el equipo. intentá de nuevo.");
        };
    }
}

// calcula y muestra las estadisticas
function actualizarEstadisticas() {
    const transaccion = db.transaction([nombreTablaEquipos], "readonly");
    const tabla = transaccion.objectStore(nombreTablaEquipos);
    const request = tabla.getAll();

    request.onsuccess = (evento) => {
        const equipos = evento.target.result;
        const equiposPorConfederacion = {};
        let totalParticipaciones = 0;
        let cantidadEquiposConParticipaciones = 0;
        const campeones = [];

        equipos.forEach(equipo => {
            // contador por confederacion
            equiposPorConfederacion[equipo.confederacion] = (equiposPorConfederacion[equipo.confederacion] || 0) + 1;

            // promedio de participaciones
            if (equipo.cantidadParticipaciones) {
                totalParticipaciones += equipo.cantidadParticipaciones;
                cantidadEquiposConParticipaciones++;
            }

            // listado de campeones
            if (equipo.mejorResultado === "campeon") {
                campeones.push(equipo.nombrePais);
            }
        });

        // mostrar equipos por confederacion
        listaEquiposPorConfederacion.innerHTML = "";
        for (const confederacion in equiposPorConfederacion) {
            const itemLista = document.createElement("li");
            itemLista.textContent = `${confederacion}: ${equiposPorConfederacion[confederacion]}`;
            listaEquiposPorConfederacion.appendChild(itemLista);
        }

        // mostrar promedio de participaciones
        const promedio = cantidadEquiposConParticipaciones > 0 ? (totalParticipaciones / cantidadEquiposConParticipaciones).toFixed(2) : 0;
        promedioParticipacionesElemento.textContent = promedio;

        // mostrar campeones
        listaCampeones.innerHTML = "";
        if (campeones.length > 0) {
            campeones.forEach(campeon => {
                const itemLista = document.createElement("li");
                itemLista.textContent = campeon;
                listaCampeones.appendChild(itemLista);
            });
        } else {
            const itemLista = document.createElement("li");
            itemLista.textContent = "ningún equipo ha sido campeón (todavía).";
            listaCampeones.appendChild(itemLista);
        }
    };

    request.onerror = (evento) => {
        console.error("error al calcular las estadísticas:", evento.target.error);
    };
}