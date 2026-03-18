/**
 * @fileoverview Cart link label that shows the current cart item count.
 */
import { useCart } from '../../cart/CartContext';

export function CartLinkLabel() {
  const { summary, loading } = useCart();

  if (loading) {
    return <>Cart</>;
  }

  return <>Cart{summary ? ` (${summary.itemCount})` : ''}</>;
}
