// PocketBase Configuration
const pb = new PocketBase('https://trifid-kerry-nonunitable.ngrok-free.dev/');

// Configurar encabezado para omitir la página de advertencia de ngrok
pb.beforeSend = function (url, options) {
    options.headers = options.headers || {};
    options.headers['ngrok-skip-browser-warning'] = 'true';
    return { url, options };
};

// Function to load image with custom headers
async function loadImageWithHeaders(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        if (!response.ok) {
            console.error('Image fetch failed:', response.status, response.statusText);
            return null;
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error loading image:', error);
        return null;
    }
}

// Admin password (cambiar en produccion)
const ADMIN_PASSWORD = 'admin123';

// State
let currentFilter = 'all';
let isAdmin = false;
let moviesData = [];
let seriesData = [];
let genresData = [];
let actorsData = [];

// DOM Elements
const loadingEl = document.getElementById('loading');
const emptyStateEl = document.getElementById('emptyState');
const moviesSection = document.getElementById('moviesSection');
const seriesSection = document.getElementById('seriesSection');
const genresSection = document.getElementById('genresSection');
const moviesGrid = document.getElementById('moviesGrid');
const seriesGrid = document.getElementById('seriesGrid');
const genresGrid = document.getElementById('genresGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const adminBtn = document.getElementById('adminBtn');
const adminModal = document.getElementById('adminModal');
const addContentModal = document.getElementById('addContentModal');
const detailModal = document.getElementById('detailModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAllContent();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            filterContent();
        });
    });

    // Search
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Admin button
    adminBtn.addEventListener('click', () => {
        adminModal.classList.add('active');
    });

    // Admin login form
    document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        if (password === ADMIN_PASSWORD) {
            isAdmin = true;
            adminModal.classList.remove('active');
            addContentModal.classList.add('active');
            document.getElementById('adminPassword').value = '';
        } else {
            alert('Contrasena incorrecta');
        }
    });

    // Close modals
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const tab = e.target.dataset.tab;
            document.querySelectorAll('.content-form').forEach(form => {
                form.classList.remove('active');
            });
            document.getElementById(tab + 'Form').classList.add('active');
        });
    });

    // Forms
    document.getElementById('movieForm').addEventListener('submit', handleMovieSubmit);
    document.getElementById('serieForm').addEventListener('submit', handleSerieSubmit);
    document.getElementById('genreForm').addEventListener('submit', handleGenreSubmit);
    document.getElementById('actorForm').addEventListener('submit', handleActorSubmit);
}

// Load all content
async function loadAllContent() {
    showLoading(true);
    try {
        await Promise.all([
            loadMovies(),
            loadSeries(),
            loadGenres(),
            loadActors()
        ]);
        filterContent();
    } catch (error) {
        console.error('Error loading content:', error);
        showError('Error al cargar el contenido');
    }
    showLoading(false);
}

// Load Movies
async function loadMovies() {
    try {
        console.log('Fetching movies from:', pb.baseUrl);
        const records = await pb.collection('Movies').getFullList({
            sort: '-created',
            expand: 'cast,genres'
        });
        console.log('Movies fetched successfully:', records.length, 'movies');
        console.log('First movie data:', records[0]);
        moviesData = records;
        renderMovies(moviesData);
    } catch (error) {
        console.error('Error loading movies:', error);
        console.error('Error details:', error.response);
        if (error.status === 403 || error.status === 401) {
            console.error('PERMISSION ERROR: The Movies collection may require authentication or public access is not enabled.');
        }
    }
}

// Load Series
async function loadSeries() {
    try {
        console.log('Fetching series from:', pb.baseUrl);
        const records = await pb.collection('Series').getFullList({
            sort: '-created',
            expand: 'cast,genres,seasons'
        });
        console.log('Series fetched successfully:', records.length, 'series');
        console.log('First serie data:', records[0]);
        seriesData = records;
        renderSeries(seriesData);
    } catch (error) {
        console.error('Error loading series:', error);
        console.error('Error details:', error.response);
        if (error.status === 403 || error.status === 401) {
            console.error('PERMISSION ERROR: The Series collection may require authentication or public access is not enabled.');
        }
    }
}

// Load Genres
async function loadGenres() {
    try {
        const records = await pb.collection('Genres').getFullList({
            sort: 'name',
        });
        genresData = records;
        renderGenres(genresData);
        populateGenreSelectors();
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

// Load Actors
async function loadActors() {
    try {
        const records = await pb.collection('Actors').getFullList({
            sort: 'Name',
        });
        actorsData = records;
        populateActorSelectors();
    } catch (error) {
        console.error('Error loading actors:', error);
    }
}

// Render Movies
function renderMovies(movies) {
    console.log('Rendering movies:', movies);
    if (!moviesGrid) {
        console.error('moviesGrid element not found');
        return;
    }
    
    if (movies.length === 0) {
        moviesGrid.innerHTML = '<p style="color: var(--text-secondary);">No hay peliculas disponibles</p>';
        return;
    }

    moviesGrid.innerHTML = movies.map((movie, index) => {
        const genres = movie.expand && movie.expand.genres ? 
            movie.expand.genres.slice(0, 3).map(g => `<span class="tag">${g.name}</span>`).join('') : '';
        
        const cardId = `movie-card-${index}`;
        
        return `
        <div class="content-card" onclick="showMovieDetail('${movie.id}')">
            <div class="card-image" id="${cardId}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                    <polyline points="17 2 12 7 7 2"></polyline>
                </svg>
            </div>
            <div class="card-content">
                <h3 class="card-title">${movie.name || 'Sin título'}</h3>
                <div class="card-meta">
                    <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${formatDate(movie.release_date)}
                    </div>
                    <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        ${movie.downloads || 0}
                    </div>
                </div>
                ${genres ? `<div class="card-tags">${genres}</div>` : ''}
            </div>
        </div>
        `;
    }).join('');
    
    // Load images after rendering
    movies.forEach(async (movie, index) => {
        if (movie.video_file) {
            const url = pb.files.getUrl(movie, movie.video_file, { thumb: '300x450' });
            const imageUrl = await loadImageWithHeaders(url);
            const cardElement = document.getElementById(`movie-card-${index}`);
            if (imageUrl && cardElement) {
                cardElement.innerHTML = `<img src="${imageUrl}" alt="${movie.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
            }
        }
    });
    
    console.log('Movies rendered successfully');
}

// Render Series
function renderSeries(series) {
    console.log('Rendering series:', series);
    if (!seriesGrid) {
        console.error('seriesGrid element not found');
        return;
    }
    
    if (series.length === 0) {
        seriesGrid.innerHTML = '<p style="color: var(--text-secondary);">No hay series disponibles</p>';
        return;
    }

    seriesGrid.innerHTML = series.map((serie, index) => {
        const genres = serie.expand && serie.expand.genres ? 
            serie.expand.genres.slice(0, 3).map(g => `<span class="tag">${g.name}</span>`).join('') : '';
        
        const cardId = `serie-card-${index}`;
        
        return `
        <div class="content-card" onclick="showSerieDetail('${serie.id}')">
            <div class="card-image" id="${cardId}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
            </div>
            <div class="card-content">
                <h3 class="card-title">${serie.name || 'Sin título'}</h3>
                <div class="card-meta">
                    <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${formatDate(serie.relase_date)}
                    </div>
                    <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        ${serie.number_seasons || 0} temporadas
                    </div>
                </div>
                ${genres ? `<div class="card-tags">${genres}</div>` : ''}
            </div>
        </div>
        `;
    }).join('');
    
    // Load images after rendering
    series.forEach(async (serie, index) => {
        if (serie.video_file) {
            const url = pb.files.getUrl(serie, serie.video_file, { thumb: '300x450' });
            const imageUrl = await loadImageWithHeaders(url);
            const cardElement = document.getElementById(`serie-card-${index}`);
            if (imageUrl && cardElement) {
                cardElement.innerHTML = `<img src="${imageUrl}" alt="${serie.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
            }
        }
    });
    
    console.log('Series rendered successfully');
}

// Render Genres
function renderGenres(genres) {
    if (genres.length === 0) {
        genresGrid.innerHTML = '<p style="color: var(--text-secondary);">No hay generos disponibles</p>';
        return;
    }

    genresGrid.innerHTML = genres.map(genre => `
        <div class="genre-card" onclick="filterByGenre('${genre.name}')">
            <h3>${genre.name}</h3>
        </div>
    `).join('');
}

// Filter Content
function filterContent() {
    moviesSection.style.display = currentFilter === 'all' || currentFilter === 'movies' ? 'block' : 'none';
    seriesSection.style.display = currentFilter === 'all' || currentFilter === 'series' ? 'block' : 'none';
    genresSection.style.display = currentFilter === 'genres' ? 'block' : 'none';
    
    emptyStateEl.style.display = 'none';
}

// Perform Search
async function performSearch() {
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
        renderMovies(moviesData);
        renderSeries(seriesData);
        emptyStateEl.style.display = 'none';
        return;
    }

    const filteredMovies = moviesData.filter(m => {
        const genreMatch = m.expand && m.expand.genres && 
            m.expand.genres.some(g => g.name.toLowerCase().includes(query));
        return m.name.toLowerCase().includes(query) || genreMatch;
    });

    const filteredSeries = seriesData.filter(s => {
        const genreMatch = s.expand && s.expand.genres && 
            s.expand.genres.some(g => g.name.toLowerCase().includes(query));
        return s.name.toLowerCase().includes(query) || genreMatch;
    });

    renderMovies(filteredMovies);
    renderSeries(filteredSeries);

    if (filteredMovies.length === 0 && filteredSeries.length === 0) {
        emptyStateEl.style.display = 'block';
    } else {
        emptyStateEl.style.display = 'none';
    }
}

// Filter by Genre
function filterByGenre(genreName) {
    searchInput.value = genreName;
    performSearch();
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-filter="all"]').classList.add('active');
    currentFilter = 'all';
    filterContent();
}

// Populate selectors
function populateGenreSelectors() {
    const movieGenresSelect = document.getElementById('movieGenres');
    const serieGenresSelect = document.getElementById('serieGenres');
    
    const options = genresData.map(genre => 
        `<option value="${genre.id}">${genre.name}</option>`
    ).join('');
    
    movieGenresSelect.innerHTML = options;
    serieGenresSelect.innerHTML = options;
}

function populateActorSelectors() {
    const movieCastSelect = document.getElementById('movieCast');
    const serieCastSelect = document.getElementById('serieCast');
    
    const options = actorsData.map(actor => 
        `<option value="${actor.id}">${actor.Name}</option>`
    ).join('');
    
    movieCastSelect.innerHTML = options;
    serieCastSelect.innerHTML = options;
}

// Show Movie Detail
async function showMovieDetail(id) {
    try {
        const movie = await pb.collection('Movies').getOne(id, {
            expand: 'cast,genres'
        });
        const detailContent = document.getElementById('detailContent');
        
        detailContent.innerHTML = `
            <div class="detail-header">
                <div class="detail-poster">
                    <div class="card-image" id="movie-detail-image" style="height: 100%;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                            <polyline points="17 2 12 7 7 2"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="detail-info">
                    <h2>${movie.name}</h2>
                    <p><strong>Fecha de Estreno:</strong> ${formatDate(movie.release_date)}</p>
                    ${movie.awards ? `<p><strong>Premios:</strong> ${movie.awards}</p>` : ''}
                    ${movie.expand && movie.expand.cast ? `<p><strong>Elenco:</strong> ${movie.expand.cast.map(a => a.Name).join(', ')}</p>` : ''}
                    ${movie.expand && movie.expand.genres ? `<p><strong>Generos:</strong> ${movie.expand.genres.map(g => g.name).join(', ')}</p>` : ''}
                    <div class="detail-stats">
                        <div class="stat">
                            <span class="stat-label">Descargas</span>
                            <span class="stat-value" id="movieDownloadCount">${movie.downloads || 0}</span>
                        </div>
                    </div>
                    <button class="btn-download" onclick="handleDownload('Movies', '${movie.id}')" style="margin-top: 20px; padding: 12px 24px; background: var(--gradient-accent); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; font-size: 16px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Descargar
                    </button>
                </div>
            </div>
        `;
        
        // Load image with headers
        if (movie.video_file) {
            const url = pb.files.getUrl(movie, movie.video_file, { thumb: '500x750' });
            const imageUrl = await loadImageWithHeaders(url);
            const imageElement = document.getElementById('movie-detail-image');
            if (imageUrl && imageElement) {
                imageElement.innerHTML = `<img src="${imageUrl}" alt="${movie.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
            }
        }
        
        detailModal.classList.add('active');
    } catch (error) {
        console.error('Error loading movie details:', error);
        alert('Error al cargar los detalles de la pelicula');
    }
}

// Show Serie Detail
async function showSerieDetail(id) {
    try {
        const serie = await pb.collection('Series').getOne(id, {
            expand: 'cast,genres,seasons'
        });
        const detailContent = document.getElementById('detailContent');
        
        detailContent.innerHTML = `
            <div class="detail-header">
                <div class="detail-poster">
                    <div class="card-image" id="serie-detail-image" style="height: 100%;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                    </div>
                </div>
                <div class="detail-info">
                    <h2>${serie.name}</h2>
                    <p><strong>Fecha de Estreno:</strong> ${formatDate(serie.relase_date)}</p>
                    <p><strong>Temporadas:</strong> ${serie.number_seasons || 0}</p>
                    ${serie.awards ? `<p><strong>Premios:</strong> ${serie.awards}</p>` : ''}
                    ${serie.expand && serie.expand.cast ? `<p><strong>Elenco:</strong> ${serie.expand.cast.map(a => a.Name).join(', ')}</p>` : ''}
                    ${serie.expand && serie.expand.genres ? `<p><strong>Generos:</strong> ${serie.expand.genres.map(g => g.name).join(', ')}</p>` : ''}
                    <div class="detail-stats">
                        <div class="stat">
                            <span class="stat-label">Descargas</span>
                            <span class="stat-value" id="serieDownloadCount">${serie.downloads || 0}</span>
                        </div>
                    </div>
                    <button class="btn-download" onclick="handleDownload('Series', '${serie.id}')" style="margin-top: 20px; padding: 12px 24px; background: var(--gradient-accent); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; font-size: 16px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Descargar
                    </button>
                </div>
            </div>
        `;
        
        // Load image with headers
        if (serie.video_file) {
            const url = pb.files.getUrl(serie, serie.video_file, { thumb: '500x750' });
            const imageUrl = await loadImageWithHeaders(url);
            const imageElement = document.getElementById('serie-detail-image');
            if (imageUrl && imageElement) {
                imageElement.innerHTML = `<img src="${imageUrl}" alt="${serie.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
            }
        }
        
        detailModal.classList.add('active');
    } catch (error) {
        console.error('Error loading serie details:', error);
        alert('Error al cargar los detalles de la serie');
    }
}

// Handle Movie Submit
async function handleMovieSubmit(e) {
    e.preventDefault();
    
    const castSelect = document.getElementById('movieCast');
    const genresSelect = document.getElementById('movieGenres');
    
    const selectedCast = Array.from(castSelect.selectedOptions).map(opt => opt.value);
    const selectedGenres = Array.from(genresSelect.selectedOptions).map(opt => opt.value);
    
    const formData = new FormData();
    formData.append('name', document.getElementById('movieName').value);
    formData.append('release_date', document.getElementById('movieReleaseDate').value);
    formData.append('awards', document.getElementById('movieAwards').value);
    formData.append('downloads', parseInt(document.getElementById('movieDownloads').value) || 0);
    
    const videoFile = document.getElementById('movieVideoFile').files[0];
    if (videoFile) {
        formData.append('video_file', videoFile);
    }
    
    selectedCast.forEach(id => formData.append('cast', id));
    selectedGenres.forEach(id => formData.append('genres', id));

    try {
        await pb.collection('Movies').create(formData);
        alert('Pelicula agregada exitosamente');
        e.target.reset();
        addContentModal.classList.remove('active');
        await loadMovies();
    } catch (error) {
        console.error('Error creating movie:', error);
        alert('Error al agregar la pelicula: ' + error.message);
    }
}

// Handle Serie Submit
async function handleSerieSubmit(e) {
    e.preventDefault();
    
    const castSelect = document.getElementById('serieCast');
    const genresSelect = document.getElementById('serieGenres');
    
    const selectedCast = Array.from(castSelect.selectedOptions).map(opt => opt.value);
    const selectedGenres = Array.from(genresSelect.selectedOptions).map(opt => opt.value);
    
    const formData = new FormData();
    formData.append('name', document.getElementById('serieName').value);
    formData.append('relase_date', document.getElementById('serieReleaseDate').value);
    formData.append('awards', document.getElementById('serieAwards').value);
    formData.append('downloads', parseInt(document.getElementById('serieDownloads').value) || 0);
    formData.append('number_seasons', parseInt(document.getElementById('serieSeasons').value) || 1);
    
    const videoFile = document.getElementById('serieVideoFile').files[0];
    if (videoFile) {
        formData.append('video_file', videoFile);
    }
    
    selectedCast.forEach(id => formData.append('cast', id));
    selectedGenres.forEach(id => formData.append('genres', id));

    try {
        await pb.collection('Series').create(formData);
        alert('Serie agregada exitosamente');
        e.target.reset();
        addContentModal.classList.remove('active');
        await loadSeries();
    } catch (error) {
        console.error('Error creating serie:', error);
        alert('Error al agregar la serie: ' + error.message);
    }
}

// Handle Genre Submit
async function handleGenreSubmit(e) {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('genreName').value
    };

    try {
        await pb.collection('Genres').create(data);
        alert('Genero agregado exitosamente');
        e.target.reset();
        addContentModal.classList.remove('active');
        await loadGenres();
    } catch (error) {
        console.error('Error creating genre:', error);
        alert('Error al agregar el genero: ' + error.message);
    }
}

// Handle Actor Submit
async function handleActorSubmit(e) {
    e.preventDefault();
    
    const data = {
        Name: document.getElementById('actorName').value,
        Country: document.getElementById('actorCountry').value,
        BirthDate: document.getElementById('actorBirthDate').value,
        Gender: document.getElementById('actorGender').value
    };

    try {
        await pb.collection('Actors').create(data);
        alert('Actor agregado exitosamente');
        e.target.reset();
        addContentModal.classList.remove('active');
    } catch (error) {
        console.error('Error creating actor:', error);
        alert('Error al agregar el actor: ' + error.message);
    }
}

// Handle Download
async function handleDownload(collectionName, id) {
    try {
        // Obtener el registro actual
        const record = await pb.collection(collectionName).getOne(id);
        
        // Incrementar las descargas
        const newDownloads = (record.downloads || 0) + 1;
        
        // Actualizar en la base de datos
        await pb.collection(collectionName).update(id, {
            downloads: newDownloads
        });
        
        // Actualizar el contador en el modal
        const countElement = document.getElementById(collectionName === 'Movies' ? 'movieDownloadCount' : 'serieDownloadCount');
        if (countElement) {
            countElement.textContent = newDownloads;
        }
        
        // Recargar los datos para reflejar el cambio en las tarjetas
        if (collectionName === 'Movies') {
            await loadMovies();
        } else {
            await loadSeries();
        }
        
        console.log(`Download count updated: ${newDownloads}`);
    } catch (error) {
        console.error('Error updating download count:', error);
        alert('Error al registrar la descarga');
    }
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

function showLoading(show) {
    loadingEl.style.display = show ? 'block' : 'none';
}

function showError(message) {
    alert(message);
}
