# NitedCryptoForum — Smart Contract (Base)

Contrato sencillo, no-token, que representa el proyecto de NitedCrypto y añade utilidades mínimas para tu dApp:
- Crear posts (con contenido off‑chain mediante `metadataURI`).
- Upvotes por usuario (una vez por post).
- Enviar tips en ETH al autor del post.

Este contrato es válido para formularios que piden “Project Smart Contract Address (NOT a token)”.

## Dirección desplegada
- 0xDa571Fa0890D0785FCe60587115eBeBE7D9365C2
- Explorer (Base):
  - Mainnet: https://basescan.org/address/0xDa571Fa0890D0785FCe60587115eBeBE7D9365C2
  - Sepolia: https://sepolia.basescan.org/address/0xDa571Fa0890D0785FCe60587115eBeBE7D9365C2

Confirma el explorer correcto según la red usada al desplegar.

## Código fuente
- Archivo: `contracts/NitedCryptoForum.sol`
- Licencia: MIT
- Solidity: `^0.8.20`

## ABI
- JSON: `contracts/abi/NitedCryptoForum.json`

## Interfaz pública
Funciones
- `postCount() → uint256` — total de posts creados.
- `posts(uint256 id) → (author, category, title, metadataURI, upvotes, tipsReceived, createdAt)` — datos de un post.
- `hasVoted(uint256 id, address user) → bool` — si `user` ya votó ese post.
- `createPost(string category, string title, string metadataURI) → uint256 id` — crea un post (el contenido completo va off‑chain, por ejemplo IPFS/HTTP).
- `upvote(uint256 id)` — un upvote por dirección y post.
- `tip(uint256 id)` `payable` — envía ETH al autor del post y acumula contador.

Eventos
- `PostCreated(uint256 id, address author, string category, string title, string metadataURI)`
- `PostUpvoted(uint256 id, address voter, uint256 newCount)`
- `PostTipped(uint256 id, address from, uint256 amount, uint256 totalToAuthor)`

## Despliegue
Opción rápida (Remix + MetaMask)
1) Abrir https://remix.ethereum.org y pegar `contracts/NitedCryptoForum.sol`.
2) Compilar con 0.8.20.
3) Deploy & Run → Environment: `Injected Provider – MetaMask`.
4) Elegir red Base (Mainnet 8453 o Sepolia 84532). Si falta, añadir RPC:
   - Mainnet: `https://mainnet.base.org` (explorer: `https://basescan.org`).
   - Sepolia: `https://sepolia.base.org` (explorer: `https://sepolia.basescan.org`).
5) Deploy y confirmar. Copiar la dirección mostrada.

Hardhat (opcional, CLI): ver `README_DEPLOY.md` para configuración y script `scripts/deploy.js`.

Verificación en BaseScan (recomendado)
- En la pestaña “Contract” del explorer, usa “Verify and Publish” con los mismos parámetros de compilación.

## Uso desde el frontend (ethers.js)
Ejemplo mínimo:

```js
import { ethers } from 'ethers';
import ABI from './contracts/abi/NitedCryptoForum.json';

const ADDRESS = '0xDa571Fa0890D0785FCe60587115eBeBE7D9365C2';
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const forum = new ethers.Contract(ADDRESS, ABI, signer);

// Crear un post (usar IPFS/HTTP para el contenido largo)
await forum.createPost('trading', 'Mi primer post', 'ipfs://Qm...');

// Upvote al post 1
await forum.upvote(1);

// Tip de 0.001 ETH al post 1 (el contrato reenvía al autor)
await forum.tip(1, { value: ethers.utils.parseEther('0.001') });
```

Nota: tu UI actual ya permite “tips” directos (wallet→wallet). Si quieres que los tips cuenten on‑chain por post, usa la función `tip(id)` del contrato.

## Seguridad y consideraciones
- Sin owner ni roles: no hay funciones administrativas.
- Patrón Checks‑Effects‑Interactions antes de transferir ETH.
- Upvotes por dirección: resistente a doble voto, no a sybil (varias direcciones).
- El contenido largo debe ir off‑chain (`metadataURI`).

## Estructura
```
contracts/
  NitedCryptoForum.sol
  abi/
    NitedCryptoForum.json
README.md
README_DEPLOY.md
```

---
Si necesitas otro contrato (por ejemplo, con gobernanza o reputación on‑chain), lo podemos extender manteniendo compatibilidad.

