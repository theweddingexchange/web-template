import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { types as sdkTypes, createImageVariantConfig } from '../util/sdkLoader';
import * as log from '../util/log';
import { storableError } from '../util/errors';
import { addMarketplaceEntities } from './marketplaceData.duck';

const { UUID } = sdkTypes;

const CART_STORAGE_KEY = 'weddingExchangeCart';

// ================ localStorage helpers ================ //

// Cart is stored in localStorage as an object: { [listingId]: quantity }
const getStoredCart = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const setStoredCart = cartObj => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartObj));
  } catch (e) {
    // ignore write errors (e.g. storage disabled)
  }
};

// ================ Async Thunks ================ //

// Fetches full listing data (price, title, images) for every item currently in the cart,
// so the cart page and any cart-count UI can display real listing info, not just IDs.
const fetchCartListingsPayloadCreator = async (_arg, thunkAPI) => {
  const { extra: sdk, rejectWithValue, dispatch } = thunkAPI;

  const storedCart = getStoredCart();
  const listingIdStrings = Object.keys(storedCart);

  if (listingIdStrings.length === 0) {
    return { apiResponse: null, items: [] };
  }

  const uuidIds = listingIdStrings.map(id => new UUID(id));

  const variantPrefix = 'listing-card';
  const aspectRatio = 1;

  return sdk.listings
    .query({
      ids: uuidIds,
      include: ['images', 'author'],
      'fields.listing': [
        'title',
        'price',
        'deleted',
        'state',
        'publicData.listingType',
        'publicData.transactionProcessAlias',
        'publicData.unitType',
      ],
      'fields.image': [
        'variants.listing-card',
        'variants.listing-card-2x',
        'variants.scaled-small',
        'variants.scaled-medium',
      ],
      ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
      ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
      'limit.images': 1,
    })
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      const items = listingIdStrings.map(idString => ({
        id: new UUID(idString),
        quantity: storedCart[idString],
      }));
      return { apiResponse: response, items };
    })
    .catch(error => {
      log.error(error, 'cart-listings-fetch-failed', {});
      return rejectWithValue(storableError(error));
    });
};

export const fetchCartListings = createAsyncThunk(
  'cart/fetchCartListings',
  fetchCartListingsPayloadCreator
);

// Adds a listing to the cart (or increments its quantity if already present),
// persists to localStorage, then re-fetches full listing data for display.
export const addToCart = (listingId, quantity = 1) => dispatch => {
  const storedCart = getStoredCart();
  const currentQty = storedCart[listingId] || 0;
  storedCart[listingId] = currentQty + quantity;
  setStoredCart(storedCart);
  return dispatch(fetchCartListings());
};

// Removes a listing from the cart entirely, persists, then refreshes.
export const removeFromCart = listingId => dispatch => {
  const storedCart = getStoredCart();
  delete storedCart[listingId];
  setStoredCart(storedCart);
  return dispatch(fetchCartListings());
};

// Sets an exact quantity for a listing already in the cart (e.g. from a quantity input on /cart).
// A quantity of 0 or less removes the item entirely.
export const updateCartQuantity = (listingId, quantity) => dispatch => {
  const storedCart = getStoredCart();
  if (quantity <= 0) {
    delete storedCart[listingId];
  } else {
    storedCart[listingId] = quantity;
  }
  setStoredCart(storedCart);
  return dispatch(fetchCartListings());
};

// ================ Slice ================ //

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [], // Array of { id: UUID, quantity: number }
    fetched: false,
    inProgress: false,
    error: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchCartListings.pending, state => {
        state.inProgress = true;
        state.fetched = false;
        state.error = null;
      })
      .addCase(fetchCartListings.fulfilled, (state, action) => {
        state.inProgress = false;
        state.fetched = true;
        state.items = action.payload.items;
      })
      .addCase(fetchCartListings.rejected, (state, action) => {
        state.inProgress = false;
        state.fetched = false;
        state.error = action.payload;
      });
  },
});

export default cartSlice.reducer;

// ================ Selectors ================ //

// Returns the total number of individual items in the cart (sum of quantities),
// for use in the Topbar cart icon badge.
export const getCartItemCount = state => {
  const items = state.cart?.items || [];
  return items.reduce((sum, item) => sum + item.quantity, 0);
};