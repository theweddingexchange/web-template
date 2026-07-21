import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { types as sdkTypes } from '../util/sdkLoader';
import * as log from '../util/log';
import { storableError } from '../util/errors';
import { addMarketplaceEntities } from './marketplaceData.duck';

const { UUID } = sdkTypes;

// ================ Async Thunks ================ //

const fetchLikedListingsPayloadCreator = async (listingIds, thunkAPI) => {
  const { extra: sdk, rejectWithValue, dispatch } = thunkAPI;

  if (!listingIds || listingIds.length === 0) {
    return { apiResponse: null, listingIds: [] };
  }

  const uuidIds = listingIds.map(id => new UUID(id));

  return sdk.listings
    .query({
      ids: uuidIds,
      include: ['images', 'author'],
      'fields.listing': [
        'title',
        'geolocation',
        'price',
        'deleted',
        'state',
        'publicData.listingType',
        'publicData.transactionProcessAlias',
        'publicData.unitType',
        'publicData.cardStyle',
        'publicData.pickupEnabled',
        'publicData.shippingEnabled',
        'publicData.priceVariationsEnabled',
        'publicData.priceVariants',
      ],
      'fields.image': [
        'variants.listing-card',
        'variants.listing-card-2x',
        'variants.scaled-small',
        'variants.scaled-medium',
      ],
      'limit.images': 1,
    })
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      return { apiResponse: response, listingIds: uuidIds };
    })
    .catch(error => {
      log.error(error, 'liked-listings-fetch-failed', {});
      return rejectWithValue(storableError(error));
    });
};

export const fetchLikedListings = createAsyncThunk(
  'likedListings/fetchLikedListings',
  fetchLikedListingsPayloadCreator
);

// ================ Slice ================ //

const likedListingsSlice = createSlice({
  name: 'likedListings',
  initialState: {
    listingIds: [],
    fetched: false,
    inProgress: false,
    error: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchLikedListings.pending, state => {
        state.inProgress = true;
        state.fetched = false;
        state.error = null;
      })
      .addCase(fetchLikedListings.fulfilled, (state, action) => {
        state.inProgress = false;
        state.fetched = true;
        state.listingIds = action.payload.listingIds;
      })
      .addCase(fetchLikedListings.rejected, (state, action) => {
        state.inProgress = false;
        state.fetched = false;
        state.error = action.payload;
      });
  },
});

export default likedListingsSlice.reducer;