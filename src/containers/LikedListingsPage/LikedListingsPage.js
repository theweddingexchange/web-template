import React, { useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';
import { fetchLikedListings } from '../../ducks/likedListings.duck';

import { Page, LayoutSingleColumn, Heading, ListingCard } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './LikedListingsPage.module.css';

const LIKED_LISTINGS_KEY = 'weddingExchangeLikedListings';

const getStoredLikedIds = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LIKED_LISTINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const LikedListingsPageComponent = props => {
  const intl = useIntl();
  const { scrollingDisabled, listings, fetchInProgress, onFetchLikedListings } = props;

  useEffect(() => {
    const likedIds = getStoredLikedIds();
    onFetchLikedListings(likedIds);
  }, []);

  return (
    <Page title="My Likes" scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        mainColumnClassName={css.layoutWrapperMain}
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        <div className={css.root}>
          <Heading as="h1" rootClassName={css.title}>
            My Likes
          </Heading>

          {fetchInProgress ? (
            <p>Loading...</p>
          ) : listings.length === 0 ? (
            <p className={css.emptyMessage}>
              You haven't liked anything yet. Tap the heart icon on any listing to save it here.
            </p>
          ) : (
            <div className={css.listingGrid}>
              {listings.map(listing => (
                <ListingCard key={listing.id.uuid} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { listingIds, inProgress } = state.likedListings;
  return {
    scrollingDisabled: isScrollingDisabled(state),
    listings: getListingsById(state, listingIds),
    fetchInProgress: inProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onFetchLikedListings: ids => dispatch(fetchLikedListings(ids)),
});

const LikedListingsPage = compose(connect(mapStateToProps, mapDispatchToProps))(LikedListingsPageComponent);

export default LikedListingsPage;