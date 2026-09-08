import {createRoot} from 'react-dom/client';
import Product from '../app/product';
import '../app/globals.css';
import '../app/product.css';
import '../app/atlas-fixes.css';
createRoot(document.getElementById('root')!).render(<Product/>);
