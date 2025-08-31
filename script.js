
        // Estado global de la aplicación
        let currentSection = 'market';
        let connectedWallet = null;
        let currentNetwork = null;
        // Web3 (selección de proveedor) y gráfico
        let selectedEthereumProvider = null;
        // Chart state (Lightweight Charts)
        let lwChart = null;
        let lwSeries = null;
        let klineSocket = null;
        const maxChartPoints = 500;
        let chartMode = 'line'; // 'line' | 'candles'
        let currentInterval = '1m';
        // Live prices cache for bot replies
        const latestPrices = {};
        let btcPriceSocket = null;
        const priceSockets = {}; // { SYMBOLPAIR: WebSocket }
        const priceSocketOrder = []; // track LRU for cleanup
        // SIWE-lite session (cliente)
        let siweSession = null; // { address, signature, message, nonce, issuedAt, chainId, domain }
        // Bot quote por defecto
        let defaultQuote = (function(){ try { return (localStorage.getItem('nc_default_quote') || 'USDT').toUpperCase(); } catch { return 'USDT'; } })();

        // Ethers helper (carga perezosa con fallback de CDNs)
        async function ensureEthers() {
            if (window.ethers) return window.ethers;
            const urls = [
                'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js'
            ];
            for (const url of urls) {
                try {
                    await new Promise((resolve, reject) => {
                        const s = document.createElement('script');
                        s.src = url;
                        s.onload = resolve;
                        s.onerror = reject;
                        document.head.appendChild(s);
                    });
                    if (window.ethers) return window.ethers;
                } catch (e) { /* try next */ }
            }
            throw new Error('No se pudo cargar ethers.js');
        }
        let selectedAvatar = '👤';
        
        // User profile data
        let userProfile = {
            displayName: '',
            bio: '',
            avatar: '👤',
            interests: [],
            memberSince: '2024',
            stats: {
                posts: 0,
                comments: 0,
                upvotes: 0,
                reputation: 100
            }
        };
        
        // DEMO: Datos simulados de criptomonedas
        // TODO: Para producción, integrar con APIs de precios reales:
        // - CoinGecko API: https://api.coingecko.com/api/v3/simple/price
        // - CoinMarketCap API: https://coinmarketcap.com/api/
        // - Binance API: https://api.binance.com/api/v3/ticker/24hr
        // - WebSocket para precios en tiempo real
        const cryptoData = [
            { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change: 2.45, icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png', marketCap: 847000000000 },
            { symbol: 'ETH', name: 'Ethereum', price: 2680.50, change: -1.23, icon: 'https://storage.googleapis.com/web-content.oanda.com/images/MR-4735-Coinpass-.format-webp.webpquality-90.height-752_528b4R2.webp', marketCap: 322000000000 },
            { symbol: 'BNB', name: 'Binance Coin', price: 315.80, change: 0.87, icon: 'https://zengo.com/wp-content/uploads/Binance-Coin-1.png', marketCap: 47000000000 },
            { symbol: 'ADA', name: 'Cardano', price: 0.485, change: 3.21, icon: 'https://cdn4.iconfinder.com/data/icons/crypto-currency-and-coin-2/256/cardano_ada-512.png', marketCap: 17000000000 },
            { symbol: 'SOL', name: 'Solana', price: 98.45, change: -2.15, icon: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png', marketCap: 42000000000 },
            { symbol: 'DOT', name: 'Polkadot', price: 7.23, change: 1.56, icon: 'https://1000logos.net/wp-content/uploads/2022/08/Polkadot-Symbol.png', marketCap: 9000000000 }
        ];
        
        // DEMO: Datos simulados de noticias
        // TODO: Para producción, reemplazar con llamadas a APIs reales:
        // - CoinDesk API: https://api.coindesk.com/v1/bpi/currentprice.json
        // - CryptoNews API: https://cryptonews-api.com/
        // - NewsAPI: https://newsapi.org/ (con filtros crypto)
        // - CoinGecko News: https://api.coingecko.com/api/v3/news
        let newsData = [
            {
                id: 1,
                title: "Bitcoin alcanza nuevo máximo histórico tras aprobación de ETF",
                summary: "El precio de Bitcoin superó los $45,000 después de que la SEC aprobara múltiples ETFs de Bitcoin spot.",
                category: "Bitcoin",
                time: "Hace 2 horas",
                image: "📈",
                author: "CryptoNews Team",
                readTime: "3 min",
                source: "CoinDesk"
            },
            {
                id: 2,
                title: "Ethereum 2.0: La actualización que cambiará todo",
                summary: "La red Ethereum completa su transición a Proof of Stake, reduciendo el consumo energético en un 99%.",
                category: "Ethereum",
                time: "Hace 4 horas",
                image: "⚡",
                author: "Vitalik Research",
                readTime: "5 min",
                source: "Ethereum Foundation"
            },
            {
                id: 3,
                title: "Base Network experimenta crecimiento explosivo en DeFi",
                summary: "La red Base de Coinbase ve un aumento del 300% en TVL durante el último mes.",
                category: "DeFi",
                time: "Hace 6 horas",
                image: "🏦",
                author: "DeFi Analytics",
                readTime: "4 min",
                source: "DeFiPulse"
            },
            {
                id: 4,
                title: "Regulación crypto: Nuevas directrices de la SEC",
                summary: "La SEC publica nuevas directrices para exchanges y proyectos DeFi en Estados Unidos.",
                category: "Regulación",
                time: "Hace 8 horas",
                image: "⚖️",
                author: "Legal Crypto",
                readTime: "6 min",
                source: "SEC.gov"
            },
            {
                id: 5,
                title: "NFTs en Base: El nuevo ecosistema emergente",
                summary: "Los NFTs en Base Network están ganando tracción con gas fees ultra bajos y integración nativa.",
                category: "NFTs",
                time: "Hace 12 horas",
                image: "🎨",
                author: "NFT Insider",
                readTime: "4 min",
                source: "OpenSea Blog"
            },
            {
                id: 6,
                title: "Análisis: ¿Está Bitcoin preparado para los $50K?",
                summary: "Los indicadores técnicos sugieren una posible ruptura alcista hacia los $50,000 en las próximas semanas.",
                category: "Análisis",
                time: "Hace 1 día",
                image: "📊",
                author: "Technical Analysis Pro",
                readTime: "7 min",
                source: "TradingView"
            }
        ];
        
        // Datos simulados de trending topics
        const trendingTopics = [
            { topic: "#BitcoinETF", posts: 1250 },
            { topic: "#EthereumUpgrade", posts: 890 },
            { topic: "#BaseNetwork", posts: 567 },
            { topic: "#DeFiSummer", posts: 445 },
            { topic: "#NFTMarket", posts: 334 }
        ];
        
        // DEMO: Datos simulados de posts del foro
        // TODO: Para producción, implementar base de datos con:
        // - PostgreSQL o MongoDB para almacenamiento
        // - Sistema de autenticación Web3 (wallet signatures)
        // - IPFS para contenido descentralizado
        // - Sistema de moderación con DAO governance
        let forumPosts = [
            {
                id: 1,
                title: "¿Cuál es la mejor estrategia DCA para Bitcoin?",
                content: "He estado investigando sobre Dollar Cost Averaging y me gustaría conocer sus experiencias. ¿Cada cuánto compran? ¿Qué porcentaje de su portfolio destinan?",
                author: "0x1234...5678",
                category: "trading",
                upvotes: 15,
                comments: [],
                time: "Hace 3 horas",
                reputation: 245,
                userVoted: false
            },
            {
                id: 2,
                title: "Tutorial: Cómo usar Uniswap en Base Network",
                content: "Guía completa para hacer swaps en la red Base con tarifas mínimas. Paso a paso desde conectar wallet hasta confirmar transacciones.",
                author: "0x9876...4321",
                category: "defi",
                upvotes: 23,
                comments: [],
                time: "Hace 5 horas",
                reputation: 892,
                userVoted: false
            },
            {
                id: 3,
                title: "Análisis técnico: BTC/USD próximos niveles",
                content: "Basándome en los patrones de velas y RSI, veo una posible corrección hacia los $41,000 antes de continuar la tendencia alcista hacia $50K.",
                author: "0x5555...7777",
                category: "trading",
                upvotes: 31,
                comments: [],
                time: "Hace 1 día",
                reputation: 634,
                userVoted: false
            },
            {
                id: 4,
                title: "🚀 Base Network: El futuro de DeFi está aquí",
                content: "Después de usar Base por 3 meses, puedo confirmar que es un game changer. Gas fees de $0.01, velocidad increíble y ecosistema creciendo rápido.",
                author: "0xABCD...1234",
                category: "defi",
                upvotes: 45,
                comments: [],
                time: "Hace 2 días",
                reputation: 1205,
                userVoted: false
            },
            {
                id: 5,
                title: "NFT Collection en Base - Feedback necesario",
                content: "Estoy desarrollando una colección de NFTs en Base Network. ¿Qué características consideran más importantes? Arte generativo vs. utilidad real.",
                author: "0x7890...ABCD",
                category: "nft",
                upvotes: 12,
                comments: [],
                time: "Hace 6 horas",
                reputation: 156,
                userVoted: false
            },
            {
                id: 6,
                title: "Ethereum Layer 2: Comparativa completa 2024",
                content: "He probado Arbitrum, Optimism, Polygon y Base. Aquí mi análisis detallado de costos, velocidad, ecosistema y adopción.",
                author: "0xDEF0...5678",
                category: "tech",
                upvotes: 67,
                comments: [],
                time: "Hace 3 días",
                reputation: 2341,
                userVoted: false
            },
            {
                id: 7,
                title: "⚠️ SCAM ALERT: Falso airdrop de Base",
                content: "Cuidado con los links que prometen airdrops de Base Network. Siempre verificar URLs oficiales. Comparto cómo identificar scams.",
                author: "0x1111...9999",
                category: "tech",
                upvotes: 89,
                comments: [],
                time: "Hace 4 horas",
                reputation: 567,
                userVoted: false
            },
            {
                id: 8,
                title: "Mi experiencia perdiendo $2K en trading de futuros",
                content: "Historia real de cómo perdí dinero haciendo trading con apalancamiento. Lecciones aprendidas y por qué ahora solo hago HODL.",
                author: "0x2222...8888",
                category: "trading",
                upvotes: 156,
                comments: [],
                time: "Hace 1 semana",
                reputation: 445,
                userVoted: false
            }
        ];

        // Persistencia: localStorage (fallback) u opcional Firebase Firestore
        const FORUM_KEY = 'nc_forum_posts_v1';
        try {
            const savedForum = localStorage.getItem(FORUM_KEY);
            if (savedForum) forumPosts = JSON.parse(savedForum);
        } catch {}
        function persistForum() {
            try { localStorage.setItem(FORUM_KEY, JSON.stringify(forumPosts)); } catch {}
        }

        // Backend opcional con Firebase (si config.js define APP_CONFIG.firebase)
        let storageMode = 'local';
        let db = null;
        let postsUnsub = null;
        let commentsUnsub = null;
        function initBackend() {
            try {
                if (window.APP_CONFIG && window.APP_CONFIG.firebase && window.firebase) {
                    firebase.initializeApp(window.APP_CONFIG.firebase);
                    db = firebase.firestore();
                    storageMode = 'firestore';
                }
            } catch (e) { console.warn('Firebase init error', e); }
        }
        initBackend();

        async function loadForumFromBackend() {
            if (storageMode !== 'firestore' || !db) return;
            try {
                const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(100).get();
                const posts = await Promise.all(snap.docs.map(async (doc) => {
                    const data = doc.data() || {};
                    // Cargar comentarios
                    let comments = [];
                    try {
                        const csnap = await db.collection('posts').doc(doc.id).collection('comments').orderBy('createdAt', 'asc').get();
                        comments = csnap.docs.map(c => ({ id: c.id, ...(c.data() || {}), time: (c.data()?.createdAt?.toDate?.() || new Date()).toLocaleString() }));
                    } catch {}
                    return {
                        id: doc.id,
                        title: data.title,
                        content: data.content,
                        author: data.author,
                        displayName: data.displayName,
                        avatar: data.avatar,
                        category: data.category || 'trading',
                        upvotes: data.upvotes || 0,
                        comments,
                        time: (data.createdAt?.toDate?.() || new Date()).toLocaleString(),
                        userVoted: false,
                    };
                }));
                forumPosts = posts;
            } catch (e) { console.warn('Firestore load error', e); }
        }

        // Real-time posts subscription
        function subscribeForumFromBackend() {
            if (storageMode !== 'firestore' || !db) return;
            if (postsUnsub) { try { postsUnsub(); } catch {} postsUnsub = null; }
            postsUnsub = db.collection('posts').orderBy('createdAt', 'desc').limit(100)
                .onSnapshot(async (snap) => {
                    const list = [];
                    snap.forEach((doc) => {
                        const data = doc.data() || {};
                        list.push({
                            id: doc.id,
                            title: data.title,
                            content: data.content,
                            author: data.author,
                            displayName: data.displayName,
                            avatar: data.avatar,
                            category: data.category || 'trading',
                            upvotes: data.upvotes || 0,
                            comments: [],
                            commentsCount: data.commentsCount || 0,
                            time: (data.createdAt?.toDate?.() || new Date()).toLocaleString(),
                            userVoted: false,
                        });
                    });
                    forumPosts = list;
                    try { renderForumPosts(); } catch {}
                }, (err) => console.warn('Firestore onSnapshot posts error', err));
        }

        async function backendCreatePost(post) {
            if (storageMode !== 'firestore' || !db) return false;
            try {
                const ref = await db.collection('posts').add({
                    title: post.title,
                    content: post.content,
                    author: post.author,
                    displayName: post.displayName,
                    avatar: post.avatar,
                    category: post.category,
                    upvotes: 0,
                    commentsCount: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                return ref.id;
            } catch (e) { console.warn('Firestore create error', e); return false; }
        }

        async function backendUpvotePost(postId, inc) {
            if (storageMode !== 'firestore' || !db) return false;
            try {
                const ref = db.collection('posts').doc(String(postId));
                await ref.set({ upvotes: firebase.firestore.FieldValue.increment(inc) }, { merge: true });
                return true;
            } catch (e) { console.warn('Firestore upvote error', e); return false; }
        }

        async function backendAddComment(postId, comment) {
            if (storageMode !== 'firestore' || !db) return false;
            try {
                await db.collection('posts').doc(String(postId)).collection('comments').add({
                    content: comment.content,
                    author: comment.author,
                    displayName: comment.displayName,
                    avatar: comment.avatar,
                    likes: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                // increment comment count
                try { await db.collection('posts').doc(String(postId)).set({ commentsCount: firebase.firestore.FieldValue.increment(1) }, { merge: true }); } catch {}
                return true;
            } catch (e) { console.warn('Firestore add comment error', e); return false; }
        }

        // Subscribe comments for a post (real-time)
        function subscribeComments(postId) {
            if (storageMode !== 'firestore' || !db) return;
            if (commentsUnsub) { try { commentsUnsub(); } catch {} commentsUnsub = null; }
            commentsUnsub = db.collection('posts').doc(String(postId)).collection('comments').orderBy('createdAt','asc')
                .onSnapshot((snap) => {
                    const post = forumPosts.find(p => p.id === postId) || { comments: [] };
                    post.comments = snap.docs.map(d => ({ id: d.id, ...(d.data()||{}), time: (d.data()?.createdAt?.toDate?.() || new Date()).toLocaleString(), userLiked: false }));
                    try { renderComments(postId); } catch {}
                }, (err) => console.warn('Firestore onSnapshot comments error', err));
        }
        
        // Variable para el post actual en el modal de comentarios
        let currentPostId = null;
        
        // Notification system
        function showNotification(message, type = 'success', duration = 4000) {
            const container = document.getElementById('notificationContainer');
            const notificationId = 'notification-' + Date.now();
            
            const typeStyles = {
                success: 'bg-green-600 border-green-500',
                error: 'bg-red-600 border-red-500',
                warning: 'bg-yellow-600 border-yellow-500',
                info: 'bg-blue-600 border-blue-500'
            };
            
            const typeIcons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            
            const notification = document.createElement('div');
            notification.id = notificationId;
            notification.className = `notification ${typeStyles[type]} border-l-4 p-4 rounded-lg shadow-lg max-w-sm`;
            notification.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="text-xl">${typeIcons[type]}</div>
                    <div class="flex-1">
                        <p class="text-white font-medium text-sm">${message}</p>
                    </div>
                    <button onclick="hideNotification('${notificationId}')" class="text-white hover:text-gray-200 text-lg">×</button>
                </div>
            `;
            
            container.appendChild(notification);
            
            // Trigger animation
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            // Auto hide
            setTimeout(() => {
                hideNotification(notificationId);
            }, duration);
        }
        
        function hideNotification(notificationId) {
            const notification = document.getElementById(notificationId);
            if (notification) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }
        
        // Top contributors simulados
        const topContributors = [
            { address: "0x1234...5678", posts: 45, reputation: 892 },
            { address: "0x9876...4321", posts: 38, reputation: 756 },
            { address: "0x5555...7777", posts: 29, reputation: 634 }
        ];

        // Gestión de secciones
        function showSection(section) {
            // Ocultar todas las secciones
            document.querySelectorAll('.section-content').forEach(el => el.classList.add('hidden'));
            
            // Mostrar la sección seleccionada
            document.getElementById(section + 'Section').classList.remove('hidden');
            currentSection = section;
            
            // Cargar contenido específico de la sección
            if (section === 'news') {
                fetchRealNews();
            } else if (section === 'forum') {
                checkForumAccess();
            } else if (section === 'trading') {
                // Trading section ya tiene contenido estático
                console.log('Trading section loaded');
            }
        }
        
        // Conexión de wallet
        async function connectWallet() {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    // Solicitar conexión
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    
                    connectedWallet = accounts[0];
                    
                    // Determinar la red
                    let networkName = 'Ethereum';
                    if (chainId === '0x2105') { // Base Mainnet
                        networkName = 'Base';
                    } else if (chainId === '0x14a34') { // Base Sepolia
                        networkName = 'Base Testnet';
                    }
                    
                    currentNetwork = networkName;
                    
                    // Actualizar UI
                    updateWalletUI();
                    
                    // Si estamos en el foro o perfil, actualizar acceso
                    if (currentSection === 'forum') {
                        checkForumAccess();
                    } else if (currentSection === 'profile') {
                        checkProfileAccess();
                    }
                    
                } catch (error) {
                    console.error('Error conectando wallet:', error);
                    alert('Error al conectar wallet. Asegúrate de tener MetaMask instalado.');
                }
            } else {
                // Simular conexión para demo
                connectedWallet = '0x1234...5678';
                currentNetwork = 'Ethereum';
                updateWalletUI();
                
                if (currentSection === 'forum') {
                    checkForumAccess();
                }
            }
        }
        
        function disconnectWallet() {
            connectedWallet = null;
            currentNetwork = null;
            updateWalletUI();
            
            if (currentSection === 'forum') {
                checkForumAccess();
            } else if (currentSection === 'profile') {
                checkProfileAccess();
            }
        }
        
        function updateWalletUI() {
            // Desktop wallet
            const connectBtn = document.getElementById('connectWalletBtn');
            const walletInfo = document.getElementById('walletInfo');
            const walletAddress = document.getElementById('walletAddress');
            const walletNetwork = document.getElementById('walletNetwork');
            const siweBtn = document.getElementById('siweBtn');
            const siweBadge = document.getElementById('siweBadge');
            
            // Mobile wallet
            const mobileConnectBtn = document.getElementById('mobileConnectWalletBtn');
            const mobileWalletInfo = document.getElementById('mobileWalletInfo');
            const mobileWalletAddress = document.getElementById('mobileWalletAddress');
            const mobileWalletNetwork = document.getElementById('mobileWalletNetwork');
            
            if (connectedWallet) {
                // Desktop
                connectBtn.classList.add('hidden');
                walletInfo.classList.remove('hidden');
                walletAddress.textContent = connectedWallet.slice(0, 6) + '...' + connectedWallet.slice(-4);
                walletNetwork.textContent = currentNetwork;
                try {
                    const key = `nc_siwe_${connectedWallet.toLowerCase()}`;
                    const raw = localStorage.getItem(key);
                    siweSession = raw ? JSON.parse(raw) : null;
                } catch { siweSession = null; }
                if (siweSession && siweSession.address && siweSession.signature) {
                    if (siweBadge) siweBadge.classList.remove('hidden');
                    if (siweBtn) siweBtn.classList.add('hidden');
                } else {
                    if (siweBadge) siweBadge.classList.add('hidden');
                    if (siweBtn) siweBtn.classList.remove('hidden');
                }
                
                // Mobile
                mobileConnectBtn.classList.add('hidden');
                mobileWalletInfo.classList.remove('hidden');
                mobileWalletAddress.textContent = connectedWallet.slice(0, 6) + '...' + connectedWallet.slice(-4);
                mobileWalletNetwork.textContent = currentNetwork;
            } else {
                // Desktop
                connectBtn.classList.remove('hidden');
                walletInfo.classList.add('hidden');
                if (siweBadge) siweBadge.classList.add('hidden');
                if (siweBtn) siweBtn.classList.add('hidden');
                
                // Mobile
                mobileConnectBtn.classList.remove('hidden');
                mobileWalletInfo.classList.add('hidden');
            }
        }
        
        // Función para toggle del menú móvil
        function toggleMobileMenu() {
            const mobileMenu = document.getElementById('mobileMenu');
            const menuIcon = document.getElementById('menuIcon');
            const closeIcon = document.getElementById('closeIcon');
            
            if (mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.remove('hidden');
                menuIcon.classList.add('hidden');
                closeIcon.classList.remove('hidden');
            } else {
                mobileMenu.classList.add('hidden');
                menuIcon.classList.remove('hidden');
                closeIcon.classList.add('hidden');
            }
        }
        
        // Gestión del perfil
        function checkProfileAccess() {
            const loginPrompt = document.getElementById('profileLoginPrompt');
            const profileContent = document.getElementById('profileContent');
            
            if (connectedWallet) {
                loginPrompt.classList.add('hidden');
                profileContent.classList.remove('hidden');
                loadUserProfile();
                renderUserActivity();
                updateProfileStats();
            } else {
                loginPrompt.classList.remove('hidden');
                profileContent.classList.add('hidden');
            }
        }
        
        function loadUserProfile() {
            // Load saved profile data from localStorage
            const savedProfile = localStorage.getItem(`profile_${connectedWallet}`);
            if (savedProfile) {
                userProfile = { ...userProfile, ...JSON.parse(savedProfile) };
            }
            
            // Update form fields
            document.getElementById('displayName').value = userProfile.displayName || '';
            document.getElementById('userBio').value = userProfile.bio || '';
            document.getElementById('currentProfilePic').textContent = userProfile.avatar;
            
            // Update interests checkboxes
            document.querySelectorAll('.interest-checkbox').forEach(checkbox => {
                checkbox.checked = userProfile.interests.includes(checkbox.value);
            });
            
            // Update wallet info
            document.getElementById('profileWalletAddress').textContent = connectedWallet.slice(0, 6) + '...' + connectedWallet.slice(-4);
            document.getElementById('profileNetwork').textContent = currentNetwork;
        }
        
        function updateProfile(event) {
            event.preventDefault();
            
            const displayName = document.getElementById('displayName').value.trim();
            const bio = document.getElementById('userBio').value.trim();
            const interests = Array.from(document.querySelectorAll('.interest-checkbox:checked')).map(cb => cb.value);
            
            if (bio.length > 200) {
                alert('La biografía no puede exceder 200 caracteres');
                return;
            }
            
            userProfile.displayName = displayName;
            userProfile.bio = bio;
            userProfile.interests = interests;
            
            // Save to localStorage
            localStorage.setItem(`profile_${connectedWallet}`, JSON.stringify(userProfile));
            
            // Update forum posts to show new display name
            updateForumPostsWithProfile();
            
            showNotification('¡Perfil actualizado exitosamente! 🎉', 'success');
        }
        
        function updateForumPostsWithProfile() {
            // Update existing posts from this user
            forumPosts.forEach(post => {
                if (post.author === connectedWallet && userProfile.displayName) {
                    post.displayName = userProfile.displayName;
                    post.avatar = userProfile.avatar;
                }
            });
            
            // Re-render forum if we're currently viewing it
            if (currentSection === 'forum' && connectedWallet) {
                renderForumPosts();
                persistForum();
            }
        }
        
        function renderUserActivity() {
            const activityContainer = document.getElementById('userActivity');
            
            // Get user's posts and comments
            const userPosts = forumPosts.filter(post => post.author === connectedWallet);
            const userComments = forumPosts.flatMap(post => 
                post.comments.filter(comment => comment.author === connectedWallet)
            );
            
            const activities = [
                ...userPosts.map(post => ({
                    type: 'post',
                    title: post.title,
                    time: post.time,
                    upvotes: post.upvotes
                })),
                ...userComments.map(comment => ({
                    type: 'comment',
                    content: comment.content.substring(0, 50) + '...',
                    time: comment.time,
                    likes: comment.likes
                }))
            ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
            
            if (activities.length === 0) {
                activityContainer.innerHTML = `
                    <div class="text-center py-8 text-gray-400">
                        <div class="text-4xl mb-2">📝</div>
                        <p>Aún no tienes actividad</p>
                        <p class="text-sm">¡Crea tu primer post en el foro!</p>
                    </div>
                `;
                return;
            }
            
            activityContainer.innerHTML = activities.map(activity => `
                <div class="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                    <div class="text-lg">${activity.type === 'post' ? '📝' : '💬'}</div>
                    <div class="flex-1">
                        <div class="font-medium text-sm">
                            ${activity.type === 'post' ? 'Post creado' : 'Comentario'}
                        </div>
                        <div class="text-gray-400 text-sm">
                            ${activity.type === 'post' ? activity.title : activity.content}
                        </div>
                        <div class="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>${activity.time}</span>
                            <span>${activity.type === 'post' ? `${activity.upvotes} upvotes` : `${activity.likes} likes`}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        function updateProfileStats() {
            const userPosts = forumPosts.filter(post => post.author === connectedWallet);
            const userComments = forumPosts.flatMap(post => 
                post.comments.filter(comment => comment.author === connectedWallet)
            );
            const totalUpvotes = userPosts.reduce((sum, post) => sum + post.upvotes, 0);
            const totalCommentLikes = userComments.reduce((sum, comment) => sum + comment.likes, 0);
            
            userProfile.stats.posts = userPosts.length;
            userProfile.stats.comments = userComments.length;
            userProfile.stats.upvotes = totalUpvotes + totalCommentLikes;
            userProfile.stats.reputation = 100 + (totalUpvotes * 5) + (totalCommentLikes * 2) + (userPosts.length * 10);
            
            document.getElementById('userPosts').textContent = userProfile.stats.posts;
            document.getElementById('userComments').textContent = userProfile.stats.comments;
            document.getElementById('userUpvotes').textContent = userProfile.stats.upvotes;
            document.getElementById('userReputation').textContent = userProfile.stats.reputation;
            document.getElementById('memberSince').textContent = userProfile.memberSince;
        }
        
        // Avatar selection functions
        function showAvatarModal() {
            document.getElementById('avatarModal').classList.remove('hidden');
            selectedAvatar = userProfile.avatar;
            
            // Highlight current avatar
            document.querySelectorAll('.avatar-option').forEach(btn => {
                btn.classList.remove('ring-2', 'ring-blue-500');
                if (btn.textContent === selectedAvatar) {
                    btn.classList.add('ring-2', 'ring-blue-500');
                }
            });
        }
        
        function hideAvatarModal() {
            document.getElementById('avatarModal').classList.add('hidden');
        }
        
        function selectAvatar(avatar) {
            selectedAvatar = avatar;
            
            // Update visual selection
            document.querySelectorAll('.avatar-option').forEach(btn => {
                btn.classList.remove('ring-2', 'ring-blue-500');
            });
            event.target.classList.add('ring-2', 'ring-blue-500');
        }
        
        function confirmAvatarSelection() {
            userProfile.avatar = selectedAvatar;
            document.getElementById('currentProfilePic').textContent = selectedAvatar;
            
            // Save to localStorage
            localStorage.setItem(`profile_${connectedWallet}`, JSON.stringify(userProfile));
            
            // Update forum posts
            updateForumPostsWithProfile();
            
            hideAvatarModal();
        }
        
        // Gestión del foro
        function checkForumAccess() {
            const loginPrompt = document.getElementById('loginPrompt');
            const forumContent = document.getElementById('forumContent');
            const newPostBtn = document.getElementById('newPostBtn');
            
            if (connectedWallet) {
                loginPrompt.classList.add('hidden');
                forumContent.classList.remove('hidden');
                newPostBtn.disabled = false;
                renderForumPosts();
                renderTopContributors();
            } else {
                loginPrompt.classList.remove('hidden');
                forumContent.classList.add('hidden');
                newPostBtn.disabled = true;
            }
        }
        
        // Renderizar noticias
        // TODO: Para producción, integrar con APIs reales como:
        // - CoinDesk API para noticias crypto
        // - CryptoNews API
        // - NewsAPI con filtros crypto
        // - RSS feeds de sitios crypto populares
function renderNews() {
            const newsContainer = document.getElementById('newsArticles');
            const trendingContainer = document.getElementById('trendingTopics');
            
            // Render real or fallback
            newsContainer.innerHTML = newsData.map(article => `
                <article class="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer" onclick="openNewsArticle(${article.id})">
                    <div class="flex items-start space-x-4">
                        ${article.imageUrl ? `<img src="${article.imageUrl}" alt="${article.title}" class="w-16 h-16 rounded-md object-cover">` : `<div class='text-4xl'>${article.image || '📰'}</div>`}
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <span class="bg-blue-600 text-xs px-2 py-1 rounded">${article.category || 'Crypto'}</span>
                                <span class="text-gray-400 text-sm">${article.time || ''}</span>
                            </div>
                            <h3 class="text-lg font-semibold mb-2 hover:text-blue-400 transition-colors">${article.title}</h3>
                            <p class="text-gray-400 text-sm">${article.summary || ''}</p>
                            <div class="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                                <span>🔗 ${article.source || ''}</span>
                            </div>
                        </div>
                    </div>
                </article>
            `).join('');
            // Inyectar botón Tip 💸 programáticamente
            try {
                postsContainer.querySelectorAll('div.bg-gray-800.rounded-xl.p-6').forEach(card => {
                    const author = card.getAttribute('data-author');
                    const actions = card.querySelector('div.flex.items-center.space-x-6');
                    if (!actions || !author) return;
                    if (actions.querySelector('.tip-button')) return;
                    const btn = document.createElement('button');
                    btn.className = 'tip-button flex items-center space-x-2 text-gray-400 hover:text-emerald-400 transition-colors';
                    btn.innerHTML = '<span>💸</span><span>Tip</span>';
                    btn.onclick = () => tipAuthor(author);
                    const reportBtn = Array.from(actions.children).find(el => (el.getAttribute('onclick')||'').includes('reportPost'));
                    if (reportBtn) actions.insertBefore(btn, reportBtn); else actions.appendChild(btn);
                });
            } catch {}
            
            if (Array.isArray(trendingTopics) && trendingTopics.length) {
                trendingContainer.innerHTML = trendingTopics.map(trend => `
                    <div class="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer" onclick="searchTrend('${trend.topic}')">
                        <span class="text-blue-400 font-medium">${trend.topic}</span>
                        <span class="text-gray-400 text-sm">${trend.posts} posts</span>
                    </div>
                `).join('');
            }
        }
        
        // DEMO: Función para simular apertura de artículo
        // TODO: Implementar modal o página completa del artículo
        function openNewsArticle(articleId) {
            const article = newsData.find(a => a.id === articleId);
            if (article) {
                alert(`DEMO: Abriendo artículo "${article.title}"\n\nEn producción esto abriría el artículo completo con contenido real de la API.`);
            }
        }
        
        // DEMO: Función para simular búsqueda de trending topic
        function searchTrend(topic) {
            alert(`DEMO: Buscando noticias relacionadas con ${topic}\n\nEn producción esto filtraría noticias por este tema.`);
        }
        
        // Renderizar posts del foro
        // TODO: Para producción, implementar:
        // - Base de datos real (PostgreSQL/MongoDB)
        // - Sistema de autenticación con wallet
        // - Paginación de posts
        // - Sistema de comentarios anidados
        // - Moderación automática y manual
        // - Sistema de reputación basado en blockchain
        function renderForumPosts(filter = 'all') {
            const postsContainer = document.getElementById('forumPosts');
            const filteredPosts = filter === 'all' ? forumPosts : forumPosts.filter(post => post.category === filter);
            
            // DEMO: Posts simulados - reemplazar con datos de base de datos real
            postsContainer.innerHTML = filteredPosts.map(post => `
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors w-full overflow-hidden" data-post-id="${post.id}" data-author="${post.author}">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm">
                                ${post.avatar || post.author.slice(2, 4).toUpperCase()}
                            </div>
                            <div class="min-w-0">
                                <div class="font-medium truncate max-w-[180px] sm:max-w-none">${post.displayName || post.author}</div>
                                <div class="text-gray-400 text-sm">${post.time}</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="bg-gray-700 text-xs px-2 py-1 rounded">${getCategoryIcon(post.category)} ${post.category}</span>
                        </div>
                    </div>
                    
                    <h3 class="text-lg font-semibold mb-2 hover:text-blue-400 transition-colors cursor-pointer" onclick="openPost(${post.id})">${post.title}</h3>
                    <p class="text-gray-400 mb-4 break-words text-sm sm:text-base">${post.content}</p>
                    
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
                        <button onclick="upvotePost(${post.id})" class="flex items-center space-x-2 ${post.userVoted ? 'text-green-400' : 'text-gray-400 hover:text-green-400'} transition-colors">
                            <span>${post.userVoted ? '⬆️' : '⬆️'}</span>
                            <span>${post.upvotes}</span>
                        </button>
                        <button onclick="openComments(${post.id})" class="flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors">
                            <span>💬</span>
                            <span>${(post.commentsCount != null ? post.commentsCount : post.comments.length)} <span class="hidden sm:inline">comentarios</span></span>
                        </button>
                        <button onclick="sharePost(${post.id})" class="flex items-center space-x-2 text-gray-400 hover:text-yellow-400 transition-colors">
                            <span>🔗</span>
                        <span class="hidden sm:inline">Compartir</span>
                        </button>
                        <button onclick="openTipModal('${post.author}')" class="flex items-center space-x-2 text-gray-400 hover:text-emerald-400 transition-colors">
                            <span>💸</span>
                            <span class="hidden sm:inline">Tip</span>
                        </button>
                        <button onclick="reportPost(${post.id})" class="flex items-center space-x-2 text-gray-400 hover:text-red-400 transition-colors">
                            <span>🚩</span>
                            <span class="hidden sm:inline">Reportar</span>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        // Funciones del foro
        function openPost(postId) {
            const post = forumPosts.find(p => p.id === postId);
            if (post) {
                openComments(postId);
            }
        }
        
        function openComments(postId) {
            if (!connectedWallet) {
                alert('Debes conectar tu wallet para ver los comentarios');
                return;
            }
            
            currentPostId = postId;
            const post = forumPosts.find(p => p.id === postId);
            
            // Mostrar contenido del post en el modal
            document.getElementById('modalPostContent').innerHTML = `
                <div class="flex items-start space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm">
                        ${post.avatar || post.author.slice(2, 4).toUpperCase()}
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <h3 class="font-semibold">${post.displayName || post.author}</h3>
                            <span class="bg-gray-700 text-xs px-2 py-1 rounded">${getCategoryIcon(post.category)} ${post.category}</span>
                            <span class="text-gray-400 text-sm">${post.time}</span>
                        </div>
                        <h4 class="text-lg font-semibold mb-3">${post.title}</h4>
                        <p class="text-gray-300">${post.content}</p>
                    </div>
                </div>
            `;
            // Real-time comments if Firestore
            try { if (storageMode === 'firestore') { subscribeComments(postId); } } catch {}
            renderComments(postId);
            document.getElementById('commentsModal').classList.remove('hidden');
        }
        
        function hideCommentsModal() {
            document.getElementById('commentsModal').classList.add('hidden');
            currentPostId = null;
            if (commentsUnsub) { try { commentsUnsub(); } catch {} commentsUnsub = null; }
        }
        
        function renderComments(postId) {
            const post = forumPosts.find(p => p.id === postId);
            const commentsList = document.getElementById('commentsList');
            
            if (post.comments.length === 0) {
                commentsList.innerHTML = `
                    <div class="text-center py-8 text-gray-400">
                        <div class="text-4xl mb-2">💬</div>
                        <p>Sé el primero en comentar este post</p>
                    </div>
                `;
                return;
            }
            
            commentsList.innerHTML = post.comments.map(comment => `
                <div class="bg-gray-700 rounded-lg p-4">
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs">
                            ${comment.avatar || comment.author.slice(2, 4).toUpperCase()}
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <span class="font-medium text-sm">${comment.displayName || comment.author}</span>
                                <span class="text-gray-400 text-xs">${comment.time}</span>
                            </div>
                            <p class="text-gray-300 text-sm">${comment.content}</p>
                            <div class="flex items-center space-x-4 mt-2">
                                <button onclick="likeComment(${postId}, ${comment.id})" class="flex items-center space-x-1 text-xs ${comment.userLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'} transition-colors">
                                    <span>❤️</span>
                                    <span>${comment.likes}</span>
                                </button>
                                <button onclick="replyToComment(${comment.id})" class="text-xs text-gray-400 hover:text-blue-400 transition-colors">
                                    Responder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        function addComment(event) {
            event.preventDefault();
            
            if (!connectedWallet) {
                alert('Debes conectar tu wallet para comentar');
                return;
            }
            
            const commentText = document.getElementById('newCommentText').value.trim();
            if (!commentText) return;
            
            const post = forumPosts.find(p => p.id === currentPostId);
            const newComment = {
                id: Date.now(),
                content: commentText,
                author: connectedWallet,
                displayName: userProfile.displayName,
                avatar: userProfile.avatar,
                time: 'Ahora',
                likes: 0,
                userLiked: false
            };
            
            post.comments.push(newComment);
            document.getElementById('newCommentText').value = '';
            
            renderComments(currentPostId);
            renderForumPosts(); // Actualizar contador de comentarios
            persistForum();
        }
        
        function likeComment(postId, commentId) {
            if (!connectedWallet) {
                alert('Debes conectar tu wallet para dar like');
                return;
            }
            
            const post = forumPosts.find(p => p.id === postId);
            const comment = post.comments.find(c => c.id === commentId);
            
            if (comment.userLiked) {
                comment.likes--;
                comment.userLiked = false;
            } else {
                comment.likes++;
                comment.userLiked = true;
            }
            
                renderComments(postId);
                persistForum();
            }
        
        function replyToComment(commentId) {
            const textarea = document.getElementById('newCommentText');
            textarea.focus();
            textarea.value = `@${commentId} `;
        }
        
        function sharePost(postId) {
            const post = forumPosts.find(p => p.id === postId);
            
            if (navigator.share) {
                navigator.share({
                    title: `NitedCrypto - ${post.title}`,
                    text: post.content.substring(0, 100) + '...',
                    url: `${window.location.origin}/post/${postId}`
                });
            } else {
                const url = `${window.location.origin}/post/${postId}`;
                navigator.clipboard.writeText(url).then(() => {
                    alert('¡Enlace copiado al portapapeles!');
                }).catch(() => {
                    prompt('Copia este enlace:', url);
                });
            }
        }
        
        function reportPost(postId) {
            if (!connectedWallet) {
                alert('Debes conectar tu wallet para reportar');
                return;
            }
            
            const reasons = [
                '1. Spam o contenido repetitivo',
                '2. Contenido inapropiado u ofensivo',
                '3. Información falsa o engañosa',
                '4. Violación de derechos de autor',
                '5. Otro motivo'
            ];
            
            const reason = prompt(`¿Por qué reportas este post?\n\n${reasons.join('\n')}\n\nEscribe el número (1-5):`);
            
            if (reason && reason >= '1' && reason <= '5') {
                alert(`Post reportado exitosamente.\n\nMotivo: ${reasons[parseInt(reason) - 1]}\n\nNuestro equipo de moderación lo revisará pronto.`);
            }
        }
        
        function renderTopContributors() {
            const contributorsContainer = document.getElementById('topContributors');
            
            contributorsContainer.innerHTML = topContributors.map((contributor, index) => `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-sm">
                            ${index + 1}
                        </div>
                        <div>
                            <div class="font-medium text-sm">${contributor.address}</div>
                            <div class="text-gray-400 text-xs">${contributor.posts} posts</div>
                        </div>
                    </div>
                    <div class="text-yellow-400 text-sm font-medium">${contributor.reputation}</div>
                </div>
            `).join('');
        }
        
        function getCategoryIcon(category) {
            const icons = {
                'trading': '📈',
                'defi': '🏦',
                'nft': '🎨',
                'tech': '⚡'
            };
            return icons[category] || '🌐';
        }
        
        function filterPosts(category) {
            renderForumPosts(category);
        }
        
        async function upvotePost(postId) {
            if (!connectedWallet) {
                alert('Debes conectar tu wallet para votar');
                return;
            }
            
            const post = forumPosts.find(p => p.id === postId) || { comments: [] };
            if (post) {
                let inc = 1;
                if (post.userVoted) { inc = -1; post.userVoted = false; } else { inc = 1; post.userVoted = true; }
                post.upvotes = Math.max(0, (post.upvotes || 0) + inc);
                renderForumPosts();
                persistForum();
                await backendUpvotePost(postId, inc).then(async ok => { if (ok) { await loadForumFromBackend(); renderForumPosts(); }});
            }
        }

        // Enviar Tip en Base (ETH)
        let tipTargetAddress = null;
        function selectTipAmount(val) {
            const input = document.getElementById('tipAmountInput');
            if (input) input.value = val;
        }
        function openTipModal(addr) {
            tipTargetAddress = addr;
            const modal = document.getElementById('tipModal');
            const tgt = document.getElementById('tipTarget');
            if (tgt) tgt.textContent = addr;
            if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
        }
        function hideTipModal() {
            const modal = document.getElementById('tipModal');
            if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
        }
        async function confirmTip() {
            const input = document.getElementById('tipAmountInput');
            const amt = (input && input.value) ? input.value.trim() : '0.0001';
            await tipAuthor(tipTargetAddress, amt);
        }
        async function tipAuthor(toAddress, amountOverride) {
            try {
                const ethers = await ensureEthers();
                if (!connectedWallet || !selectedEthereumProvider) { showNotification('Conecta tu wallet primero', 'warning'); return; }
                if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress || '')) { showNotification('Dirección inválida para tip', 'error'); return; }
                // Monto
                let amount = amountOverride || '0.0001';
                const value = ethers.utils.parseEther(amount);
                // Cambiar a Base si es necesario
                try { await selectedEthereumProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] }); }
                catch (switchError) {
                    if (switchError && switchError.code === 4902) {
                        try {
                            await selectedEthereumProvider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x2105', chainName: 'Base Mainnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'] }] });
                        } catch (addErr) { showNotification('No se pudo agregar Base', 'error'); return; }
                    } else { showNotification('No se pudo cambiar a Base', 'error'); return; }
                }
                // Enviar tx
                const tx = await selectedEthereumProvider.request({ method: 'eth_sendTransaction', params: [{ from: connectedWallet, to: toAddress, value: ethers.utils.hexlify(value) }] });
                const link = `https://basescan.org/tx/${tx}`;
                showNotification('Tip enviado 🚀', 'success');
                try {
                    const info = document.getElementById('tipLink');
                    const a = document.getElementById('tipTxHref');
                    if (a && info) { a.href = link; a.textContent = tx.slice(0,10)+'...'; info.classList.remove('hidden'); }
                } catch {}
                hideTipModal();
            } catch (e) {
                console.error('Tip error', e);
                showNotification('Fallo al enviar tip', 'error');
            }
        }
        
        // Modal de nuevo post
        function showNewPostModal() {
            if (!connectedWallet) {
                alert('Debes conectar tu wallet primero');
                return;
            }
            document.getElementById('newPostModal').classList.remove('hidden');
        }
        
        function hideNewPostModal() {
            document.getElementById('newPostModal').classList.add('hidden');
            // Limpiar formulario
            document.getElementById('postTitle').value = '';
            document.getElementById('postContent').value = '';
        }
        
        async function createPost(event) {
            event.preventDefault();
            
            const title = document.getElementById('postTitle').value.trim();
            const category = document.getElementById('postCategory').value;
            const content = document.getElementById('postContent').value.trim();
            
            if (!title || !content) {
                alert('Por favor completa todos los campos');
                return;
            }
            
            const newPost = {
                id: Date.now(),
                title: title,
                content: content,
                author: connectedWallet,
                displayName: userProfile.displayName,
                avatar: userProfile.avatar,
                category: category,
                upvotes: 0,
                comments: [],
                time: 'Ahora',
                userVoted: false
            };
            
            forumPosts.unshift(newPost);
            renderForumPosts();
            persistForum();
            // Backend opcional: con onSnapshot no hace falta recargar manualmente
            const createdId = await backendCreatePost(newPost);
            hideNewPostModal();
            persistForum();
            
            // Mostrar mensaje de éxito
            showNotification('¡Post creado exitosamente! 🎉', 'success');
        }
        
        // Renderizar lista de criptomonedas
        function renderCryptoList() {
            const container = document.getElementById('cryptoList');
            container.innerHTML = cryptoData.map(crypto => `
                <div class="crypto-card rounded-lg p-3 md:p-4 flex items-center justify-between hover:bg-gray-700 transition-colors cursor-pointer" onclick="setSymbol('${crypto.symbol}USDT')">
                    <div class="flex items-center space-x-2 md:space-x-4">
                        <div class="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
                            <img src="${crypto.icon}" alt="${crypto.name}" class="w-full h-full object-contain rounded-full" onerror="this.src=''; this.alt='${crypto.symbol}'; this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs hidden">${crypto.symbol}</div>
                        </div>
                        <div>
                            <div class="font-semibold text-sm md:text-base">${crypto.symbol}</div>
                            <div class="text-xs md:text-sm text-gray-400 hidden md:block">${crypto.name}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-semibold text-sm md:text-base">$${crypto.price.toLocaleString()}</div>
                        <div class="text-xs md:text-sm ${crypto.change >= 0 ? 'price-up' : 'price-down'}">
                            ${crypto.change >= 0 ? '+' : ''}${crypto.change}%
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Simular actualizaciones de precios
        function updatePrices() {
            cryptoData.forEach(crypto => {
                const changePercent = (Math.random() - 0.5) * 0.1;
                crypto.price *= (1 + changePercent);
                crypto.change = (Math.random() - 0.5) * 10;
            });
            renderCryptoList();
        }

        // DEMO: Bot de chat con respuestas simuladas
        // TODO: Para producción, integrar con:
        // - OpenAI GPT API para respuestas inteligentes
        // - Datos en tiempo real de precios y noticias
        // - Base de conocimiento crypto actualizada
        // - Sistema de aprendizaje basado en interacciones
        const botResponses = {
            'precio': 'Bitcoin está actualmente en $43,250. ¡Ha subido un 2.45% en las últimas 24 horas! 📈',
            'bitcoin': 'Bitcoin (BTC) es la primera y más grande criptomoneda. Actualmente cotiza a $43,250 con una tendencia alcista.',
            'ethereum': 'Ethereum (ETH) está en $2,680.50. La red ha estado muy activa con las actualizaciones de ETH 2.0! ⚡',
            'análisis': 'Basado en los indicadores técnicos, el mercado muestra señales mixtas. RSI en 65, MACD positivo. 📊',
            'noticias': 'Últimas noticias: Bitcoin ETF aprobado, Ethereum actualización exitosa, regulaciones crypto en desarrollo. 📰',
            'ayuda': 'Puedo ayudarte con: precios en tiempo real, análisis técnico, noticias crypto, explicaciones de conceptos y más! 🚀',
            'base': 'Base Network es la Layer 2 de Coinbase construida en Optimism. Gas fees ultra bajos y gran adopción! 🔵',
            'defi': 'DeFi (Finanzas Descentralizadas) permite servicios financieros sin intermediarios. ¡El futuro de las finanzas! 🏦',
            'nft': 'Los NFTs están evolucionando hacia utilidad real. En Base Network hay proyectos muy interesantes! 🎨'
        };

        function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message) return;

            addMessage(message, 'user');
            input.value = '';

            // Simular respuesta del bot
            setTimeout(() => {
                showTyping();
                setTimeout(async () => {
                    hideTyping();
                    const response = await getBotResponseAsync(message);
                    addMessage(response, 'bot');
                }, 1500);
            }, 500);
        }

        function quickMessage(message) {
            document.getElementById('chatInput').value = message;
            sendMessage();
        }

        function addMessage(message, sender) {
            const container = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'flex items-start space-x-2';
            
            if (sender === 'user') {
                messageDiv.innerHTML = `
                    <div class="chat-bubble-user text-white p-2 md:p-3 rounded-lg rounded-tr-none max-w-xs ml-auto text-xs md:text-sm">
                        ${message}
                    </div>
                    <div class="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs">
                        👤
                    </div>
                `;
                messageDiv.classList.add('flex-row-reverse');
            } else {
                messageDiv.innerHTML = `
                    <div class="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs">
                        🤖
                    </div>
                    <div class="chat-bubble-bot text-white p-2 md:p-3 rounded-lg rounded-tl-none max-w-xs text-xs md:text-sm">
                        ${message}
                    </div>
                `;
            }
            
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }

        function showTyping() {
            const container = document.getElementById('chatMessages');
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typing';
            typingDiv.className = 'flex items-start space-x-2';
            typingDiv.innerHTML = `
                <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm">
                    🤖
                </div>
                <div class="bg-gray-700 p-3 rounded-lg rounded-tl-none">
                    <div class="flex space-x-1">
                        <div class="typing-indicator"></div>
                        <div class="typing-indicator"></div>
                        <div class="typing-indicator"></div>
                    </div>
                </div>
            `;
            container.appendChild(typingDiv);
            container.scrollTop = container.scrollHeight;
        }

        function hideTyping() {
            const typing = document.getElementById('typing');
            if (typing) typing.remove();
        }

        function getBotResponse(message) {
            const lowerMessage = message.toLowerCase();
            
            for (const [key, response] of Object.entries(botResponses)) {
                if (lowerMessage.includes(key)) {
                    return response;
                }
            }
            
            return '¡Interesante pregunta! Puedo ayudarte con precios, análisis técnico, noticias crypto y más. ¿Qué te gustaría saber específicamente? 🤔';
        }

        async function getBotResponseAsync(message) {
            const lower = message.toLowerCase();
            // Preguntas de precio BTC
            const asksPrice = /(precio|price|cuánto|vale|cotiza)/.test(lower);
            const mentionsBtc = /(\bbtc\b|bitcoin|btc\/usdt|btc-usdt)/.test(lower);
            if (asksPrice && mentionsBtc) {
                let p = latestPrices['BTCUSDT'];
                if (typeof p === 'undefined') {
                    try {
                        const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
                        const j = await r.json();
                        p = Number(j.price);
                        latestPrices['BTCUSDT'] = p;
                    } catch {}
                }
                if (typeof p !== 'undefined') {
                    return `BTC/USDT está en $ ${p.toLocaleString(undefined, { maximumFractionDigits: 8 })} (en vivo)`;
                }
                return 'No pude obtener el precio en vivo ahora. Intenta de nuevo en unos segundos.';
            }
            // Fallback a respuestas predefinidas
            return getBotResponse(message);
        }

        // Event listener para Enter en el chat
        document.getElementById('chatInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Inicializar la página
        renderCryptoList();
        
        // Actualizar precios de lista cada 10s (CoinGecko)
        setInterval(updatePrices, 10000);
        try { if (storageMode === 'firestore') { subscribeForumFromBackend(); } else { loadForumFromBackend().then(()=>{}); } } catch {}

        // Estadísticas globales reales (CoinGecko + Fear & Greed)
        async function updateGlobalStats() {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/global');
                const j = await res.json();
                const d = j && j.data ? j.data : null;
                if (!d) return;
                const mc = d.total_market_cap && d.total_market_cap.usd;
                const vol = d.total_volume && d.total_volume.usd;
                const dom = d.market_cap_percentage && d.market_cap_percentage.btc;
                if (mc) document.getElementById('marketCap').textContent = '$' + Math.round(mc).toLocaleString();
                if (vol) document.getElementById('volume24h').textContent = '$' + Math.round(vol).toLocaleString();
                if (dom !== undefined) document.getElementById('btcDominance').textContent = dom.toFixed(1) + '%';
            } catch (e) { console.warn('Global stats error', e); }
        }

        async function updateFearGreed() {
            try {
                const res = await fetch('https://api.alternative.me/fng/?limit=1');
                const j = await res.json();
                const v = j && j.data && j.data[0] && j.data[0].value;
                if (v !== undefined) document.getElementById('fearGreed').textContent = v;
            } catch (e) { console.warn('F&G error', e); }
        }

        // Inicializar y refrescar
        updateGlobalStats();
        updateFearGreed();
        setInterval(updateGlobalStats, 30000); // 30s
        setInterval(updateFearGreed, 600000); // 10 min

        // ==============================
        // Añadidos: Gráfico en tiempo real + Wallet modal
        // ==============================
        function initPriceChart() {
            const container = document.getElementById('lwChart');
            if (!container || typeof LightweightCharts === 'undefined') return;
            if (lwChart) return;
            lwChart = LightweightCharts.createChart(container, {
                layout: { background: { color: '#111827' }, textColor: '#cbd5e1' },
                rightPriceScale: { borderColor: '#334155' },
                timeScale: { borderColor: '#334155' },
                grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
                autoSize: true,
            });
            window.addEventListener('resize', () => { try { lwChart.timeScale().fitContent(); } catch {} });
        }

        // pushChartPoint eliminado (no usado en Lightweight Charts)

        // stopPriceStream eliminado (no usado en Lightweight Charts)

        function startPriceStream(symbol) { /* deprecated - using kline stream for both modes */ }

        function attachSymbolSelector() {
            const sel = document.getElementById('symbolSelect');
            if (!sel) return;
            sel.addEventListener('change', () => updateChartFlowByControls());
        }

        function ensureLineChart() {
            if (!lwChart) initPriceChart();
            if (lwSeries) { try { lwChart.removeSeries(lwSeries); } catch {} lwSeries = null; }
            lwSeries = lwChart.addAreaSeries({
                lineColor: '#3b82f6',
                topColor: 'rgba(59, 130, 246, 0.35)',
                bottomColor: 'rgba(59, 130, 246, 0.05)',
                lineWidth: 2,
            });
        }

        function ensureCandleChart() {
            if (!lwChart) initPriceChart();
            if (lwSeries) { try { lwChart.removeSeries(lwSeries); } catch {} lwSeries = null; }
            lwSeries = lwChart.addCandlestickSeries({
                upColor: '#16a34a',
                downColor: '#ef4444',
                borderUpColor: '#16a34a',
                borderDownColor: '#ef4444',
                wickUpColor: '#16a34a',
                wickDownColor: '#ef4444'
            });
        }

        function stopKlineStream() {
            if (klineSocket) {
                try { klineSocket.onclose = null; klineSocket.onerror = null; klineSocket.onmessage = null; } catch {}
                try { klineSocket.close(); } catch {}
                klineSocket = null;
            }
        }

        async function loadInitialCandles(symbol, interval, forType = 'candles') {
            try {
                const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${maxChartPoints}`);
                const data = await res.json();
                if (!Array.isArray(data)) return;
                if (forType === 'candles') {
                    const mapped = data.map(k => ({ time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4] }));
                    lwSeries.setData(mapped);
                } else {
                    const mapped = data.map(k => ({ time: Math.floor(k[0] / 1000), value: +k[4] }));
                    lwSeries.setData(mapped);
                }
            } catch (e) {
                console.warn('Fallo al cargar velas iniciales:', e);
            }
        }

        function startKlineStream(symbol, interval) {
            stopKlineStream();
            const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
            try { klineSocket = new WebSocket(url); } catch { return; }
            klineSocket.onmessage = (evt) => {
                try {
                    const d = JSON.parse(evt.data);
                    const k = d.k;
                    if (!k) return;
                    const t = Math.floor(k.t / 1000);
                    if (chartMode === 'candles') {
                        lwSeries.update({ time: t, open: +k.o, high: +k.h, low: +k.l, close: +k.c });
                    } else {
                        lwSeries.update({ time: t, value: +k.c });
                    }
                    latestPrices[symbol.toUpperCase()] = +k.c;
                    const cp = document.getElementById('currentPrice');
                    if (cp) cp.textContent = `$ ${Number(k.c).toLocaleString(undefined, { maximumFractionDigits: 8 })}`;
                } catch {}
            };
            klineSocket.onopen = () => {
                const dot = document.getElementById('liveDot');
                const status = document.getElementById('streamStatus');
                if (dot) { dot.classList.remove('bg-yellow-500'); dot.classList.add('bg-green-500'); }
                if (status) status.textContent = 'En vivo';
            };
            klineSocket.onerror = () => {
                const status = document.getElementById('streamStatus');
                if (status) status.textContent = 'Reconectando...';
            };
            klineSocket.onclose = () => { setTimeout(() => startKlineStream(symbol, interval), 2000); };
        }

        function updateChartFlowByControls() {
            const sel = document.getElementById('symbolSelect');
            const typeSel = document.getElementById('chartTypeSelect');
            const intSel = document.getElementById('intervalSelect');
            const symbol = (sel && sel.value) || 'BTCUSDT';
            chartMode = (typeSel && typeSel.value) || 'line';
            currentInterval = (intSel && intSel.value) || '1m';

            // Habilitar/deshabilitar TF (solo para velas)
            if (intSel) intSel.disabled = chartMode !== 'candles';

            stopKlineStream();
            if (chartMode === 'line') {
                ensureLineChart();
                loadInitialCandles(symbol, currentInterval, 'line').then(() => startKlineStream(symbol, currentInterval));
            } else {
                ensureCandleChart();
                loadInitialCandles(symbol, currentInterval, 'candles').then(() => startKlineStream(symbol, currentInterval));
            }
        }

        function attachChartControls() {
            const typeSel = document.getElementById('chartTypeSelect');
            const intSel = document.getElementById('intervalSelect');
            if (typeSel) typeSel.addEventListener('change', () => updateChartFlowByControls());
            if (intSel) intSel.addEventListener('change', () => updateChartFlowByControls());
        }

        // Exponer para clicks desde la lista
        window.setSymbol = function(sym) {
            const pair = sym.toUpperCase().endsWith('USDT') ? sym.toUpperCase() : sym.toUpperCase() + 'USDT';
            const sel = document.getElementById('symbolSelect');
            if (sel) sel.value = pair;
            updateChartFlowByControls();
        }

        // Sobrescribir updatePrices para usar CoinGecko (lo usará el setInterval existente)
        async function updatePrices() {
            const idMap = { BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', ADA: 'cardano', SOL: 'solana', DOT: 'polkadot' };
            const ids = cryptoData.map(c => idMap[c.symbol]).filter(Boolean).join(',');
            try {
                const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
                const data = await res.json();
                cryptoData.forEach(c => {
                    const key = idMap[c.symbol];
                    if (data[key]) {
                        c.price = data[key].usd;
                        c.change = Number((data[key].usd_24h_change || 0).toFixed(2));
                    }
                });
                renderCryptoList();
            } catch (e) {
                console.warn('Fallo al obtener precios de CoinGecko:', e);
            }
        }

        // Mejorar connectWallet con selección de wallet inyectada
        window.connectWallet = async function () {
            if (typeof window.ethereum === 'undefined') {
                alert('No se detectó ninguna wallet. Instala MetaMask o una wallet compatible.');
                return;
            }
            const providers = Array.isArray(window.ethereum.providers) && window.ethereum.providers.length
                ? window.ethereum.providers
                : [window.ethereum];
            if (providers.length > 1) {
                showWalletModal(providers);
                return;
            }
            await connectWithProvider(providers[0]);
        }

        async function connectWithProvider(ethProvider) {
            try {
                selectedEthereumProvider = ethProvider;
                const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
                const chainId = await ethProvider.request({ method: 'eth_chainId' });
                connectedWallet = accounts && accounts.length ? accounts[0] : null;
                let networkName = 'Ethereum';
                if (chainId === '0x2105') networkName = 'Base';
                else if (chainId === '0x14a34') networkName = 'Base Testnet';
                currentNetwork = networkName;
                try { ethProvider.removeAllListeners && ethProvider.removeAllListeners(); } catch {}
                ethProvider.on && ethProvider.on('accountsChanged', (accs) => {
                    connectedWallet = accs && accs.length ? accs[0] : null;
                    updateWalletUI();
                });
                ethProvider.on && ethProvider.on('chainChanged', (cid) => {
                    let net = 'Ethereum';
                    if (cid === '0x2105') net = 'Base';
                    else if (cid === '0x14a34') net = 'Base Testnet';
                    currentNetwork = net;
                    updateWalletUI();
                });
                updateWalletUI();
                if (currentSection === 'forum') { checkForumAccess(); }
                else if (currentSection === 'profile') { checkProfileAccess(); }
            } catch (error) {
                console.error('Error conectando wallet:', error);
                alert('Error al conectar wallet. Verifica permisos en tu extensión.');
            } finally {
                hideWalletModal();
            }
        }

        function showWalletModal(providers) {
            const modal = document.getElementById('walletModal');
            const list = document.getElementById('walletOptions');
            if (!modal || !list) return;
            list.innerHTML = '';
            // WalletConnect tile (QR)
            try {
                const wcId = window.APP_CONFIG && window.APP_CONFIG.walletconnectProjectId;
                const wcBtn = document.createElement('button');
                wcBtn.className = 'w-full flex items-center justify-between bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded-lg px-4 py-3 transition-colors mb-2';
                wcBtn.innerHTML = `<span class="font-medium">WalletConnect (QR)</span><span class="text-xs ${wcId ? 'text-gray-400' : 'text-red-400'}">${wcId ? 'v2' : 'Config requerida'}</span>`;
                wcBtn.onclick = () => connectWithWalletConnect();
                list.appendChild(wcBtn);
            } catch {}
            const nameOf = (p) => {
                if (p.isMetaMask) return 'MetaMask';
                if (p.isCoinbaseWallet) return 'Coinbase Wallet';
                if (p.isBraveWallet) return 'Brave Wallet';
                if (p.isTrust) return 'Trust Wallet';
                if (p.isRabby) return 'Rabby';
                return p?.name || 'Wallet';
            };
            providers.forEach((prov) => {
                const btn = document.createElement('button');
                btn.className = 'w-full flex items-center justify-between bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded-lg px-4 py-3 transition-colors';
                btn.innerHTML = `<span class="font-medium">${nameOf(prov)}</span><span class="text-xs text-gray-400">EIP-1193</span>`;
                btn.onclick = () => connectWithProvider(prov);
                list.appendChild(btn);
            });
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function hideWalletModal() {
            const modal = document.getElementById('walletModal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        async function connectWithWalletConnect() {
            try {
                const projectId = window.APP_CONFIG && window.APP_CONFIG.walletconnectProjectId;
                if (!projectId || !window.WalletConnectEthereumProvider) {
                    alert('Configura walletconnectProjectId en config.js');
                    return;
                }
                const wcProvider = await window.WalletConnectEthereumProvider.init({
                    projectId,
                    chains: [8453], // Forzar Base por defecto
                    optionalChains: [1, 84532], // Ethereum y Base Sepolia opcionales
                    showQrModal: true,
                    methods: ['eth_sendTransaction','personal_sign','eth_signTypedData','eth_sign','eth_requestAccounts']
                });
                await wcProvider.enable();
                await connectWithProvider(wcProvider);
            } catch (e) {
                console.error('WalletConnect error', e);
                alert('No se pudo conectar con WalletConnect');
            }
        }

        // SIWE-lite (solo cliente): firma un mensaje con la wallet y valida localmente
        async function signInWithEthereum() {
            if (!selectedEthereumProvider || !connectedWallet) {
                showNotification('Conecta tu wallet primero', 'warning');
                return;
            }
            try {
                const ethers = await ensureEthers();
                const domain = window.location.host;
                const issuedAt = new Date().toISOString();
                const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
                // SIWE core-like message
                const message = `${domain} quiere verificar tu sesión.\n\nDirección: ${connectedWallet}\nCadena: ${currentNetwork}\nNonce: ${nonce}\nEmitido: ${issuedAt}`;
                const signature = await selectedEthereumProvider.request({ method: 'personal_sign', params: [ message, connectedWallet ] });
                // Verificar localmente
                const recovered = ethers.utils.verifyMessage(message, signature);
                if (recovered.toLowerCase() !== connectedWallet.toLowerCase()) throw new Error('Firma inválida');
                siweSession = { address: connectedWallet, signature, message, nonce, issuedAt, chainId: currentNetwork, domain };
                try { localStorage.setItem(`nc_siwe_${connectedWallet.toLowerCase()}`, JSON.stringify(siweSession)); } catch {}
                updateWalletUI();
                showNotification('Login Web3 verificado ✅', 'success');
            } catch (e) {
                console.error('SIWE-lite error', e);
                showNotification('No se pudo verificar la sesión', 'error');
            }
        }

        window.switchToBase = async function () {
            const eth = selectedEthereumProvider || window.ethereum;
            if (!eth) return alert('No hay wallet disponible.');
            try {
                await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] });
            } catch (e) {
                if (e && e.code === 4902) {
                    try {
                        await eth.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x2105',
                                chainName: 'Base Mainnet',
                                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org']
                            }]
                        });
                    } catch (addErr) {
                        console.error('No se pudo agregar Base:', addErr);
                    }
                } else {
                    console.error('No se pudo cambiar a Base:', e);
                }
            }
        }

        // Lanzar inicialización de gráfico y precios
        try {
            initPriceChart();
            attachSymbolSelector();
        } catch {}

        // Asegurar controles de tipo/intervalo y actualizar flujo
        try {
            attachChartControls();
            updateChartFlowByControls();
        } catch {}

        // Iniciar ticker de BTC para respuestas del bot
        (function startBtcPriceTicker() {
            if (btcPriceSocket) return;
            try { btcPriceSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade'); } catch { return; }
            btcPriceSocket.onmessage = (evt) => { try { const d = JSON.parse(evt.data); if (d && d.p) latestPrices['BTCUSDT'] = Number(d.p); } catch {} };
            btcPriceSocket.onclose = () => { btcPriceSocket = null; setTimeout(startBtcPriceTicker, 3000); };
        })();

        // Helpers para soporte multi-asset en el bot
        function resolveBaseSymbol(token) {
            const t = (token || '').toUpperCase();
            const map = { BITCOIN: 'BTC', BTC: 'BTC', ETHEREUM: 'ETH', ETH: 'ETH', BNB: 'BNB', SOLANA: 'SOL', SOL: 'SOL', CARDANO: 'ADA', ADA: 'ADA', POLKADOT: 'DOT', DOT: 'DOT', MATIC: 'MATIC', XRP: 'XRP', DOGE: 'DOGE', DOGECOIN: 'DOGE' };
            return map[t] || t.replace(/[^A-Z0-9]/g, '').slice(0, 10);
        }
        function resolveQuoteSymbol(token) {
            const t = (token || 'USDT').toUpperCase();
            const map = { USD: 'USDT', USDT: 'USDT', USDC: 'USDC', BUSD: 'BUSD', BTC: 'BTC', ETH: 'ETH' };
            return map[t] || 'USDT';
        }
        function formatPair(pair) { return pair.replace(/USDT$/, 'USDT').replace(/([A-Z]{3,5})(USDT|USDC|BUSD|BTC|ETH)/, '$1/$2'); }
        function ensureTicker(pair) {
            const sym = (pair || '').toUpperCase();
            if (!sym) return;
            if (sym === 'BTCUSDT') { if (!btcPriceSocket) { try { btcPriceSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade'); } catch { return; } btcPriceSocket.onmessage = (evt) => { try { const d = JSON.parse(evt.data); if (d && d.p) latestPrices['BTCUSDT'] = Number(d.p); } catch {} }; btcPriceSocket.onclose = () => { btcPriceSocket = null; setTimeout(() => ensureTicker('BTCUSDT'), 3000); }; } return; }
            if (priceSockets[sym]) return;
            try {
                const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@trade`);
                ws.onmessage = (evt) => { try { const d = JSON.parse(evt.data); if (d && d.p) latestPrices[sym] = Number(d.p); } catch {} };
                ws.onclose = () => { try { delete priceSockets[sym]; const i = priceSocketOrder.indexOf(sym); if (i>=0) priceSocketOrder.splice(i,1); } catch {} };
                priceSockets[sym] = ws;
                priceSocketOrder.push(sym);
                if (priceSocketOrder.length > 5) { const old = priceSocketOrder.shift(); try { priceSockets[old]?.close(); delete priceSockets[old]; } catch {} }
            } catch {}
        }
        async function getLivePrice(pair) {
            ensureTicker(pair);
            if (typeof latestPrices[pair] !== 'undefined') return latestPrices[pair];
            try { const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`); const j = await r.json(); const p = Number(j.price); if (!isNaN(p)) { latestPrices[pair] = p; } return p; } catch { return undefined; }
        }
        // Sobrescribir el bot para soportar múltiples símbolos y /price
        async function getBotResponseAsync(message) {
            const lower = (message || '').toLowerCase();
            const cmd = lower.match(/\/(price|precio)\s+([a-z0-9]+)(?:\s*[\/\-\s]\s*([a-z0-9]+))?/i);
            let pair = null;
            if (cmd) {
                const base = resolveBaseSymbol(cmd[2]);
                const quote = resolveQuoteSymbol(cmd[3] || 'USDT');
                pair = (base + quote).toUpperCase();
            } else {
                const asksPrice = /(precio|price|cu[aá]nto|vale|cotiza|rate|quote)/i.test(lower);
                const mPair = lower.match(/\b([a-z]{2,10})\s*(?:[\/\-\s])\s*([a-z]{3,5})\b/i);
                if (mPair) {
                    const base = resolveBaseSymbol(mPair[1]);
                    const quote = resolveQuoteSymbol(mPair[2]);
                    pair = (base + quote).toUpperCase();
                } else if (asksPrice) {
                    const mBase = lower.match(/\b(btc|bitcoin|eth|ethereum|bnb|sol|solana|ada|cardano|dot|polkadot|matic|xrp|doge)\b/i);
                    if (mBase) { pair = (resolveBaseSymbol(mBase[1]) + 'USDT').toUpperCase(); }
                }
            }
            if (pair) {
                const price = await getLivePrice(pair);
                if (typeof price !== 'undefined') return `${formatPair(pair)} está en $ ${Number(price).toLocaleString(undefined, { maximumFractionDigits: 8 })} (en vivo)`;
                return `No pude obtener el precio de ${formatPair(pair)} ahora. Intenta de nuevo en unos segundos.`;
            }
            return getBotResponse(message);
        }

        // Noticias reales (CryptoCompare)
        async function fetchRealNews() {
            const url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
            const CACHE_KEY = 'nc_news_cache_v1';
            const TTL = 24 * 60 * 60 * 1000; // 24h
            try {
                // Leer cache
                const raw = localStorage.getItem(CACHE_KEY);
                if (raw) {
                    try {
                        const cached = JSON.parse(raw);
                        if (cached && Array.isArray(cached.data) && (Date.now() - cached.timestamp) < TTL) {
                            newsData = cached.data;
                            trendingTopics = cached.trending || [];
                            renderNews();
                            return; // cache válido
                        }
                    } catch {}
                }

                // Fetch remoto y actualizar cache
                const res = await fetch(url);
                const json = await res.json();
                if (!json || !Array.isArray(json.Data)) { renderNews(); return; }
                newsData = json.Data.slice(0, 15).map((n, idx) => ({
                    id: n.id || idx + 1,
                    title: n.title,
                    summary: n.body ? n.body.slice(0, 180) + '…' : '',
                    category: (n.categories || 'Crypto').split('|')[0],
                    time: new Date((n.published_on || 0) * 1000).toLocaleString(),
                    imageUrl: n.imageurl && n.imageurl.startsWith('http') ? n.imageurl : (n.imageurl ? `https://www.cryptocompare.com${n.imageurl}` : ''),
                    author: n.source_info?.name || n.source || 'CryptoCompare',
                    readTime: '',
                    source: n.source_info?.name || n.source || 'CryptoCompare',
                    url: n.url
                }));
                const counts = {};
                newsData.forEach(a => { const k = a.category || 'Crypto'; counts[k] = (counts[k] || 0) + 1; });
                trendingTopics = Object.entries(counts).map(([topic, posts]) => ({ topic: `#${topic}`, posts })).slice(0, 6);
                try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: newsData, trending: trendingTopics })); } catch {}
                renderNews();
            } catch (e) {
                console.warn('No se pudieron obtener noticias reales:', e);
                renderNews();
            }
        }

        // Sobrescribe función para abrir noticia en su URL
        function openNewsArticle(articleId) {
            const article = newsData.find(a => a.id === articleId);
            if (article && article.url) window.open(article.url, '_blank');
        }

        // Refresco diario de noticias (24h)
        try { setInterval(() => { fetchRealNews(); }, 24 * 60 * 60 * 1000); } catch {}

        // Override final: soporte /price con lista de símbolos
        async function getBotResponseAsync(message) {
            const lower = (message || '').toLowerCase();

            // /price BTC,ETH SOL
            const cmdAll = lower.match(/\/(price|precio)\s+(.+)/i);
            if (cmdAll) {
                const rest = cmdAll[2].trim();
                const rawTokens = rest.split(/[\s,]+/).filter(Boolean).slice(0, 10);
                const pairs = [];
                for (const tok of rawTokens) {
                    const m = tok.match(/^([a-z0-9]+)(?:[\/\-]([a-z0-9]+))?$/i);
                    if (!m) continue;
                    const base = resolveBaseSymbol(m[1]);
                    const quote = resolveQuoteSymbol(m[2] || 'USDT');
                    pairs.push((base + quote).toUpperCase());
                }
                if (pairs.length) {
                    const uniq = Array.from(new Set(pairs));
                    const prices = await Promise.all(uniq.map(p => getLivePrice(p)));
                    const lines = uniq.map((p, i) => {
                        const val = prices[i];
                        return `${formatPair(p)}: ${typeof val !== 'undefined' ? ('$ ' + Number(val).toLocaleString(undefined, { maximumFractionDigits: 8 })) : '—'}`;
                    });
                    return `Precios en vivo\n` + lines.join('\n');
                }
            }

            // Natural: un solo par
            let pair = null;
            const asksPrice = /(precio|price|cu[aá]nto|vale|cotiza|rate|quote)/i.test(lower);
            const mPair = lower.match(/\b([a-z]{2,10})\s*(?:[\/\-\s])\s*([a-z]{3,5})\b/i);
            if (mPair) {
                const base = resolveBaseSymbol(mPair[1]);
                const quote = resolveQuoteSymbol(mPair[2]);
                pair = (base + quote).toUpperCase();
            } else if (asksPrice) {
                const mBase = lower.match(/\b(btc|bitcoin|eth|ethereum|bnb|sol|solana|ada|cardano|dot|polkadot|matic|xrp|doge)\b/i);
                if (mBase) { pair = (resolveBaseSymbol(mBase[1]) + 'USDT').toUpperCase(); }
            }
            if (pair) {
                const price = await getLivePrice(pair);
                if (typeof price !== 'undefined') return `${formatPair(pair)} está en $ ${Number(price).toLocaleString(undefined, { maximumFractionDigits: 8 })} (en vivo)`;
                return `No pude obtener el precio de ${formatPair(pair)} ahora. Intenta de nuevo en unos segundos.`;
            }
            return getBotResponse(message);
        }
