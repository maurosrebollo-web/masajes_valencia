document.addEventListener('DOMContentLoaded', () => {
    // 0. LIMPIEZA AUTOMÁTICA DE TURNOS PASADOS A HISTORIAL
    function procesarHistorialYVencidos() {
        let reservas = JSON.parse(localStorage.getItem('masajes_reservas')) || [];
        let historial = JSON.parse(localStorage.getItem('masajes_historial')) || [];
        const ahora = new Date();
        let reservasActivas = [];

        reservas.forEach(r => {
            const fechaHoraTurno = new Date(`${r.fecha}T${r.hora}:00`);
            if (fechaHoraTurno > ahora) {
                reservasActivas.push(r);
            } else {
                const yaExiste = historial.some(h => h.id === r.id);
                if (!yaExiste) {
                    historial.push({ ...r, estado: "Completado / Atendido" });
                }
            }
        });

        localStorage.setItem('masajes_reservas', JSON.stringify(reservasActivas));
        localStorage.setItem('masajes_historial', JSON.stringify(historial));
    }
    procesarHistorialYVencidos();

    // 1. CARGAR SERVICIOS DINÁMICOS (CON OPCIÓN DE 50 Y 80 MINUTOS)
    const contenedorServicios = document.getElementById('contenedor-servicios-publico');
    const selectServicioReserva = document.getElementById('servicio-select');

    function cargarServiciosPublicos() {
        let servicios = JSON.parse(localStorage.getItem('masajes_catalogo')) || [
            { id: 1, nombre: "Masaje Relajante", precio: "40€ / 50 min", desc: "Movimientos suaves y fluidos para calmar el sistema nervioso, aliviar el estrés y promover un descanso profundo.", imagen: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=500&q=80" },
            { id: 2, nombre: "Masaje Descontracturante", precio: "45€ / 50 min", desc: "Técnica profunda orientada a liberar nudos y sobrecargas musculares en espalda, cuello y hombros.", imagen: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=500&q=80" }
        ];

        if (!contenedorServicios || !selectServicioReserva) return;

        contenedorServicios.innerHTML = '';
        selectServicioReserva.innerHTML = '';

        servicios.forEach(s => {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <img src="${s.imagen}" alt="${s.nombre}">
                <div class="card-body">
                    <h3>${s.nombre}</h3>
                    <p>${s.desc}</p>
                    <div class="card-footer">
                        <span class="price">${s.precio}</span>
                        <a href="#reservas" class="btn-secondary">Reservar</a>
                    </div>
                </div>
            `;
            contenedorServicios.appendChild(card);

            const opt50 = document.createElement('option');
            opt50.value = `${s.nombre} (50 min)`;
            opt50.textContent = `${s.nombre} - 50 minutos`;
            selectServicioReserva.appendChild(opt50);

            const opt80 = document.createElement('option');
            opt80.value = `${s.nombre} (80 min)`;
            opt80.textContent = `${s.nombre} - 80 minutos (Sesión extendida)`;
            selectServicioReserva.appendChild(opt80);
        });
    }
    cargarServiciosPublicos();

    // 2. CARGAR BLOG Y VIDEOS (LOCAL O URL)
    const contenedorBlog = document.getElementById('contenedor-blog-publico');
    function cargarBlogPublico() {
        let posts = JSON.parse(localStorage.getItem('masajes_blog')) || [];
        if (!contenedorBlog) return;

        if(posts.length === 0) {
            contenedorBlog.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#666;">Próximamente publicaremos consejos y videos de nuestros masajes.</p>`;
            return;
        }

        contenedorBlog.innerHTML = '';
        posts.forEach(p => {
            const postCard = document.createElement('div');
            postCard.className = 'service-card';
            
            let elementoVideo = '';
            if (p.tipoVideo === 'local') {
                elementoVideo = `<video controls style="width:100%; height:200px; object-fit:cover; background:#000;">
                    <source src="${p.video}" type="video/mp4">
                    Tu navegador no soporta videos.
                </video>`;
            } else {
                elementoVideo = `<iframe src="${p.video}" style="width:100%; height:200px; border:none;" allowfullscreen></iframe>`;
            }

            postCard.innerHTML = `
                ${elementoVideo}
                <div class="card-body">
                    <h3>${p.titulo}</h3>
                    <p>${p.texto}</p>
                </div>
            `;
            contenedorBlog.appendChild(postCard);
        });
    }
    cargarBlogPublico();

    // 3. LÓGICA DE CALENDARIO Y RESERVAS
    const inputFecha = document.getElementById('fecha-reserva');
    let reservas = JSON.parse(localStorage.getItem('masajes_reservas')) || [];

    if(inputFecha) {
        const hoy = new Date().toISOString().split('T')[0];
        inputFecha.min = hoy;
        inputFecha.value = hoy;
        inputFecha.addEventListener('change', actualizarHorariosDisponibles);
    }

    function actualizarHorariosDisponibles() {
        const fechaSeleccionada = inputFecha.value;
        const selectHora = document.getElementById('hora-reserva');
        if (!selectHora) return;
        
        selectHora.innerHTML = '';

        // Lee los horarios personalizados desde el admin (o usa los predeterminados)
        const horariosBase = JSON.parse(localStorage.getItem('masajes_horarios')) || ["10:00", "11:30", "16:00", "17:30", "19:00"];

        const horasOcupadas = reservas.filter(r => r.fecha === fechaSeleccionada).map(r => r.hora);
        const horasLibres = horariosBase.filter(h => !horasOcupadas.includes(h));

        if (horasLibres.length === 0) {
            let option = document.createElement('option');
            option.value = "";
            option.textContent = "No hay turnos disponibles para este día";
            selectHora.appendChild(option);
        } else {
            horasLibres.forEach(hora => {
                let option = document.createElement('option');
                option.value = hora;
                option.textContent = `${hora} hs`;
                selectHora.appendChild(option);
            });
        }
    }

    if(inputFecha) actualizarHorariosDisponibles();

    const formReserva = document.getElementById('form-reserva');
    if(formReserva) {
        formReserva.addEventListener('submit', (e) => {
            e.preventDefault();
            const servicio = document.getElementById('servicio-select').value;
            const fecha = document.getElementById('fecha-reserva').value;
            const hora = document.getElementById('hora-reserva').value;
            const nombre = document.getElementById('nombre-cliente').value;
            const telefono = document.getElementById('telefono-cliente').value;
            const alergias = document.getElementById('alergias-cliente').value || 'Ninguna';
            const lesiones = document.getElementById('lesiones-cliente').value || 'Ninguna';
            const enfoque = document.getElementById('enfoque-cliente').value || 'General';

            if(!hora) {
                alert("Por favor selecciona un horario válido.");
                return;
            }

            reservas.push({ 
                id: Date.now(), 
                servicio, 
                fecha, 
                hora, 
                nombre, 
                telefono, 
                alergias, 
                lesiones, 
                enfoque 
            });
            
            localStorage.setItem('masajes_reservas', JSON.stringify(reservas));

            alert(`¡Cita reservada con éxito para el ${fecha} a las ${hora} hs! Te esperamos.`);
            formReserva.reset();
            inputFecha.value = new Date().toISOString().split('T')[0];
            actualizarHorariosDisponibles();
        });
    }

    // Cancelar Cita
    const btnCancelar = document.getElementById('btn-cancelar');
    if(btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            const telBuscado = document.getElementById('telefono-cancelar').value.trim();
            const mensajeStatus = document.getElementById('mensaje-cancelacion');

            if(!telBuscado) {
                mensajeStatus.style.color = "red";
                mensajeStatus.textContent = "Introduce un número de teléfono.";
                return;
            }

            const index = reservas.findIndex(r => r.telefono === telBuscado);
            if(index !== -1) {
                const cancelada = reservas.splice(index, 1)[0];
                localStorage.setItem('masajes_reservas', JSON.stringify(reservas));
                mensajeStatus.style.color = "green";
                mensajeStatus.textContent = `Cita de ${cancelada.servicio} el ${cancelada.fecha} a las ${cancelada.hora} cancelada con éxito.`;
                document.getElementById('telefono-cancelar').value = '';
                actualizarHorariosDisponibles();
            } else {
                mensajeStatus.style.color = "red";
                mensajeStatus.textContent = "No se encontraron reservas activas con ese teléfono.";
            }
        });
    }
});