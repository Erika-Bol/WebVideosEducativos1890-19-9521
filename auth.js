// Configuración de validaciones (Reglas de Negocio)
const carnetRegex = /^\d{4}-\d{2}-\d{4}$/; // Máscara: 0000-00-0000
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Email estándar
const pinRegex = /^\d+$/; // Solo números, sin espacios ni letras

// Claves para localStorage
const USERS_KEY = 'edustream_users';
const CURRENT_USER_KEY = 'edustream_current_user';

// Obtener usuarios
function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

// Guardar usuarios
function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Registrar usuario
function registerUser(nombre, carnet, email, pin) {
    // Validaciones
    if (!carnetRegex.test(carnet)) {
        return { success: false, message: 'El carnet debe tener el formato 0000-00-0000.' };
    }
    if (!emailRegex.test(email)) {
        return { success: false, message: 'El correo electrónico no tiene un formato válido.' };
    }
    if (!pinRegex.test(pin)) {
        return { success: false, message: 'El PIN debe ser estrictamente numérico, sin letras ni espacios.' };
    }

    const users = getUsers();
    
    // Validar unicidad
    const carnetExists = users.some(u => u.carnet === carnet);
    if (carnetExists) {
        return { success: false, message: 'Ya existe un usuario registrado con este carnet.' };
    }
    const emailExists = users.some(u => u.email === email);
    if (emailExists) {
        return { success: false, message: 'Ya existe un usuario registrado con este correo electrónico.' };
    }

    // Registrar
    const newUser = { nombre, carnet, email, pin };
    users.push(newUser);
    saveUsers(users);
    
    return { success: true, message: 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.' };
}

// Iniciar sesión
function loginUser(loginId, pin) {
    if (!pinRegex.test(pin)) {
        return { success: false, message: 'El PIN debe ser estrictamente numérico.' };
    }

    const users = getUsers();
    
    // Buscar usuario por carnet O por correo
    const user = users.find(u => (u.carnet === loginId || u.email === loginId));
    
    if (!user) {
        return { success: false, message: 'Usuario no encontrado.' };
    }
    
    if (user.pin !== pin) {
        return { success: false, message: 'PIN incorrecto.' };
    }
    
    // Sesión iniciada
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ nombre: user.nombre, carnet: user.carnet, email: user.email }));
    return { success: true, message: 'Inicio de sesión exitoso.' };
}

// Cerrar sesión
function logoutUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.reload();
}

// Obtener usuario actual
function getCurrentUser() {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
}

// Verificar si está autenticado
function isAuthenticated() {
    return getCurrentUser() !== null;
}

// Exportar para usar en otras páginas si es necesario o tener disponible en global
window.AuthAPI = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    isAuthenticated
};
