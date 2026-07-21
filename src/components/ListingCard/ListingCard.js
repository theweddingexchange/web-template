// ⚠️ If you modify the styling of this component and you're using the SectionListings component in your marketplace (featured listings)
// please reflect those changes in the calculateCarouselHeight function in SectionListing.js to avoid layout issues
import React, { useState, useEffect } from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';

import { useIntl } from '../../util/reactIntl';
import { requireListingImage } from '../../util/configHelpers';
import { lazyLoadWithDimensions } from '../../util/uiHelpers';
import { createSlug } from '../../util/urlHelpers';

import {
  AspectRatioWrapper,
  NamedLink,
  ResponsiveImage,
  ListingCardThumbnail,
} from '../../components';

import { getListingCardTranslations } from './ListingCard.helpers';

import css from './ListingCard.module.css';

const LazyImage = lazyLoadWithDimensions(ResponsiveImage, { loadAfterInitialRendering: 3000 });

const LIKED_LISTINGS_KEY = 'weddingExchangeLikedListings';

const getLikedListingIds = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LIKED_LISTINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const setLikedListingIds = ids => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LIKED_LISTINGS_KEY, JSON.stringify(ids));
  } catch (e) {
    // ignore write errors (e.g. storage disabled)
  }
};

/**
 * LikeButton
 * Heart icon overlaid on the top-right of a listing card's image.
 * Toggles a liked state stored in localStorage, keyed by listing id.
 * @component
 */
const LikeButton = ({ listingId }) => {
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    const likedIds = getLikedListingIds();
    setIsLiked(likedIds.includes(listingId));
  }, [listingId]);

  const handleClick = e => {
    e.preventDefault();
    e.stopPropagation();
    if (!listingId) return;

    const likedIds = getLikedListingIds();
    const alreadyLiked = likedIds.includes(listingId);
    const updated = alreadyLiked
      ? likedIds.filter(id => id !== listingId)
      : [...likedIds, listingId];

    setLikedListingIds(updated);
    setIsLiked(!alreadyLiked);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isLiked ? 'Remove from likes' : 'Add to likes'}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 2,
        border: 'none',
        background: 'rgba(255, 255, 255, 0.85)',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 20.5C12 20.5 3 15 3 8.7C3 5.5 5.5 3 8.5 3C10.2 3 11.5 3.8 12 5C12.5 3.8 13.8 3 15.5 3C18.5 3 21 5.5 21 8.7C21 15 12 20.5 12 20.5Z"
          style={
            isLiked
              ? { fill: '#b81414', stroke: '#b81414' }
              : { fill: 'none', stroke: '#b81414' }
          }
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};

/**
 * ListingCardImage
 * Component responsible for rendering the image part of the listing card.
 * It either renders the first image from the listing's images array with lazy loading,
 * or a stylized placeholder if images are disabled for the listing type.
 * Also wraps the image in a fixed aspect ratio container for consistent layout.
 * @component
 * @param {Object} props
 * @param {Object} props.listing listing entity with image data
 * @param {Function?} props.setActivePropsMaybe mouse enter/leave handlers for map highlighting
 * @param {string} props.title listing title for alt text
 * @param {string} props.renderSizes img/srcset size rules
 * @param {number} props.aspectWidth aspect ratio width
 * @param {number} props.aspectHeight aspect ratio height
 * @param {string} props.variantPrefix image variant prefix (e.g. "listing-card")
 * @param {boolean} props.showListingImage whether to show actual listing image or not
 * @param {Object?} props.style the background color for the listing card with no image
 * @returns {JSX.Element} listing image with fixed aspect ratio or fallback preview
 */
const ListingCardImage = props => {
  const {
    listing,
    setActivePropsMaybe,
    title,
    renderSizes,
    aspectWidth,
    aspectHeight,
    variantPrefix,
    aspectRatioClassName,
    lazyLoadImage,
  } = props;

  const firstImage = listing?.images?.[0] || null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants).filter(k => k.startsWith(variantPrefix))
    : [];

  const aspectRatioClass = aspectRatioClassName || css.aspectRatioWrapper;
  const ImageComponent = lazyLoadImage ? LazyImage : ResponsiveImage;

  return (
    <AspectRatioWrapper
      className={aspectRatioClass}
      width={aspectWidth}
      height={aspectHeight}
      {...setActivePropsMaybe}
    >
      <ImageComponent
        rootClassName={css.rootForImage}
        alt={title}
        image={firstImage}
        variants={variants}
        sizes={renderSizes}
      />
    </AspectRatioWrapper>
  );
};

/**
 * ListingCard
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to component's own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.aspectRatioClassName custom className for AspectRatioWrapper component
 * @param {Object} props.listing API entity: listing or ownListing
 * @param {string?} props.renderSizes for img/srcset
 * @param {Function?} props.setActiveListing
 * @param {boolean?} props.showAuthorInfo
 * @returns {JSX.Element} listing card to be used in search result panel etc.
 */
export const ListingCard = props => {
  const config = useConfiguration();
  const intl = props.intl || useIntl();

  const {
    className,
    rootClassName,
    aspectRatioClassName,
    darkMode,
    listing,
    renderSizes,
    setActiveListing,
    showAuthorInfo = true,
    lazyLoadImage = true,
  } = props;

  const translations = getListingCardTranslations(listing, config, intl);
  const {
    titlePlain,
    titleFormatted,
    cardAriaLabel,
    showPrice,
    priceTooltip,
    priceMessage,
    authorName,
  } = translations;

  const classes = classNames(rootClassName || css.root, className);

  const id = listing?.id?.uuid;
  const { title = '', publicData } = listing?.attributes || {};
  const slug = createSlug(title);

  const { listingType, cardStyle } = publicData || {};
  const validListingTypes = config.listing.listingTypes || [];
  const foundListingTypeConfig = validListingTypes.find(conf => conf.listingType === listingType);
  // Render the listing image only if listing images are enabled in the listing type
  const showListingImage = requireListingImage(foundListingTypeConfig);

  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;

  // Sets the listing as active in the search map when hovered (if the search map is enabled)
  const setActivePropsMaybe = setActiveListing
    ? {
        onMouseEnter: () => setActiveListing(listing?.id),
        onMouseLeave: () => setActiveListing(null),
      }
    : null;

  return (
    <NamedLink
      className={classes}
      name="ListingPage"
      params={{ id, slug }}
      ariaLabel={cardAriaLabel}
    >
      <div style={{ position: 'relative' }}>
        {showListingImage ? (
          <ListingCardImage
            renderSizes={renderSizes}
            title={titlePlain}
            listing={listing}
            setActivePropsMaybe={setActivePropsMaybe}
            aspectWidth={aspectWidth}
            aspectHeight={aspectHeight}
            variantPrefix={variantPrefix}
            aspectRatioClassName={aspectRatioClassName}
            lazyLoadImage={lazyLoadImage}
          />
        ) : (
          <ListingCardThumbnail
            style={cardStyle}
            listingTitle={title}
            className={aspectRatioClassName}
            width={aspectWidth}
            height={aspectHeight}
            setActivePropsMaybe={setActivePropsMaybe}
          />
        )}
        <LikeButton listingId={id} />
      </div>
      <div className={css.info}>
        {showPrice ? (
          <div className={css.price} title={priceTooltip}>
            {priceMessage}
          </div>
        ) : null}
        <div className={css.mainInfo}>
          {showListingImage && (
            <div className={classNames(css.title, { [css.lightText]: darkMode })}>
              {titleFormatted}
            </div>
          )}
          {showAuthorInfo ? (
            <div className={classNames(css.authorInfo, { [css.lightText]: darkMode })}>
              {authorName}
            </div>
          ) : null}
        </div>
      </div>
    </NamedLink>
  );
};

export default ListingCard;