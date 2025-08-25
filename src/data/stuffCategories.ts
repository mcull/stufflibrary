export const STUFF_CATEGORIES = [
  // Home & Garden
  'Tools & Hardware',
  'Gardening & Landscaping',
  'Home Improvement',
  'Appliances',
  'Furniture',
  'Home Decor',
  'Cleaning Supplies',

  // Recreation & Sports
  'Sports Equipment',
  'Outdoor Gear',
  'Camping & Hiking',
  'Exercise Equipment',
  'Bicycles & Accessories',
  'Water Sports',
  'Winter Sports',

  // Kids & Family
  'Baby & Toddler Items',
  'Toys & Games',
  'Kids Clothing',
  'School Supplies',
  'Strollers & Car Seats',
  'Educational Materials',

  // Electronics & Tech
  'Electronics',
  'Cameras & Photography',
  'Audio Equipment',
  'Computer Accessories',
  'Gaming Equipment',

  // Automotive
  'Car Care Products',
  'Automotive Tools',
  'Car Accessories',

  // Kitchen & Cooking
  'Kitchen Appliances',
  'Cookware & Bakeware',
  'Party Supplies',
  'Serving Dishes',

  // Books & Media
  'Books',
  'Movies & Music',
  'Art Supplies',
  'Craft Supplies',

  // Clothing & Accessories
  'Adult Clothing',
  'Shoes & Accessories',
  'Jewelry',

  // Miscellaneous
  'Storage & Organization',
  'Office Supplies',
  'Pet Supplies',
  'Holiday Decorations',
  'Musical Instruments',
  'Other',
] as const;

export type StuffCategory = typeof STUFF_CATEGORIES[number];