import React, { useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useIntl, FormattedMessage } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';
import {
  fetchCartListings,
  removeFromCart,
  updateCartQuantity,
} from '../../ducks/cart.duck';

import { Page, LayoutSingleColumn, Heading, NamedLink } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './CartPage.module.css';

const { Money } = sdkTypes;

const CartLineItem = props => {
  const { listing, quantity, intl, onRemove, onUpdateQuantity } = props;

  const { title } = listing.attributes || {};
  const price = listing.attributes?.price;
  const availableStock = listing.currentStock?.attributes?.quantity;
  const hasStockLimit = typeof availableStock === 'number';
  const firstImage = listing.images?.[0] || null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants || {}).filter(k =>
        k.startsWith('listing-card')
      )
    : [];
  const imageUrl =
    firstImage && variants.length > 0
      ? firstImage.attributes.variants[variants[0]].url
      : null;

  const lineTotal =
    price && price.currency
      ? new Money(price.amount * quantity, price.currency)
      : null;

  return (
    <div className={css.lineItem}>
      <div className={css.imageWrapper}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className={css.image} />
        ) : (
          <div className={css.imagePlaceholder}>
            <FormattedMessage id="CartPage.noImage" defaultMessage="No image" />
          </div>
        )}
      </div>

      <div className={css.details}>
        <NamedLink
          className={css.title}
          name="ListingPage"
          params={{ id: listing.id.uuid, slug: title }}
        >
          {title}
        </NamedLink>

        {price ? (
          <div className={css.unitPrice}>{formatMoney(intl, price)}</div>
        ) : null}

        <div className={css.quantityRow}>
          <label htmlFor={`quantity-${listing.id.uuid}`} className={css.quantityLabel}>
            <FormattedMessage id="CartPage.quantityLabel" defaultMessage="Qty" />
          </label>
          <input
            id={`quantity-${listing.id.uuid}`}
            type="number"
            min="1"
            max={hasStockLimit ? availableStock : undefined}
            value={quantity}
            onChange={e => {
              const rawQty = parseInt(e.target.value, 10);
              if (isNaN(rawQty)) return;
              const clampedQty = hasStockLimit
                ? Math.min(Math.max(rawQty, 1), availableStock)
                : Math.max(rawQty, 1);
              onUpdateQuantity(listing.id.uuid, clampedQty);
            }}
            className={css.quantityInput}
          />
          {hasStockLimit ? (
            <span className={css.stockNote}>
              <FormattedMessage
                id="CartPage.stockNote"
                defaultMessage="{availableStock} available"
                values={{ availableStock }}
              />
            </span>
          ) : null}
        </div>

        <button
          type="button"
          className={css.removeButton}
          onClick={() => onRemove(listing.id.uuid)}
        >
          <FormattedMessage id="CartPage.removeButton" defaultMessage="Remove" />
        </button>
      </div>

      {lineTotal ? (
        <div className={css.lineTotal}>{formatMoney(intl, lineTotal)}</div>
      ) : null}
    </div>
  );
};

export const CartPageComponent = props => {
  const intl = useIntl();
  const {
    scrollingDisabled,
    listings,
    cartItems,
    fetchInProgress,
    onFetchCartListings,
    onRemoveFromCart,
    onUpdateCartQuantity,
  } = props;

  useEffect(() => {
    onFetchCartListings();
  }, []);

  const getQuantityForListing = listingId => {
    const match = cartItems.find(item => item.id.uuid === listingId.uuid);
    return match ? match.quantity : 1;
  };

  // Compute cart total across all line items that share the marketplace currency.
  // Items with a missing or mismatched currency are skipped from the total (rare edge case).
  const total = listings.reduce((sum, listing) => {
    const price = listing.attributes?.price;
    const quantity = getQuantityForListing(listing.id);
    if (!price || (sum && sum.currency !== price.currency)) {
      return sum;
    }
    const lineAmount = price.amount * quantity;
    return sum ? new Money(sum.amount + lineAmount, sum.currency) : new Money(lineAmount, price.currency);
  }, null);

  return (
    <Page title="My Cart" scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        mainColumnClassName={css.layoutWrapperMain}
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        <div className={css.root}>
          <Heading as="h1" rootClassName={css.title}>
            <FormattedMessage id="CartPage.heading" defaultMessage="My Cart" />
          </Heading>

          {fetchInProgress ? (
            <p>
              <FormattedMessage id="CartPage.loading" defaultMessage="Loading..." />
            </p>
          ) : listings.length === 0 ? (
            <p className={css.emptyMessage}>
              <FormattedMessage
                id="CartPage.emptyMessage"
                defaultMessage="Your cart is empty. Add some listings to get started."
              />
            </p>
          ) : (
            <>
              <div className={css.lineItemList}>
                {listings.map(listing => (
                  <CartLineItem
                    key={listing.id.uuid}
                    listing={listing}
                    quantity={getQuantityForListing(listing.id)}
                    intl={intl}
                    onRemove={onRemoveFromCart}
                    onUpdateQuantity={onUpdateCartQuantity}
                  />
                ))}
              </div>

              {total ? (
                <div className={css.totalRow}>
                  <span className={css.totalLabel}>
                    <FormattedMessage id="CartPage.totalLabel" defaultMessage="Total" />
                  </span>
                  <span className={css.totalValue}>{formatMoney(intl, total)}</span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { items, inProgress } = state.cart;
  const listingIds = items.map(item => item.id);
  return {
    scrollingDisabled: isScrollingDisabled(state),
    listings: getListingsById(state, listingIds),
    cartItems: items,
    fetchInProgress: inProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onFetchCartListings: () => dispatch(fetchCartListings()),
  onRemoveFromCart: listingId => dispatch(removeFromCart(listingId)),
  onUpdateCartQuantity: (listingId, quantity) => dispatch(updateCartQuantity(listingId, quantity)),
});

const CartPage = compose(connect(mapStateToProps, mapDispatchToProps))(CartPageComponent);

export default CartPage;