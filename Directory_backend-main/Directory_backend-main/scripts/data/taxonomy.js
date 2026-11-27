// Lokal Lens's own category list for Indian local businesses: main categories, their subcategories, common services and the
// extra questions ("Category details") each one asks. Written for this project; edit freely and run seed-taxonomy.js again.
const select = (key, label, options) => ({ key, label, type: 'select', options });
const multi = (key, label, options) => ({ key, label, type: 'multi', options });
const text = (key, label, placeholder) => ({ key, label, type: 'text', placeholder });
const number = (key, label, unit, placeholder) => ({ key, label, type: 'number', unit, placeholder });
const list = (value) => value.split('|');

// sub('Dentists', 'Dental check-up|Root canal treatment', [fields])
const sub = (name, services, fields = []) => ({ name, services: list(services), fields });
const category = (slug, name, icon, services, subcategories, fields = []) => ({ slug, name, icon, services: list(services), subcategories, fields });

export const TAXONOMY = [
  category('cafes-restaurants', 'Cafes & Restaurants', 'utensils', 'Dine-in|Takeaway|Home delivery|Table booking|Party orders|Catering', [
    sub('Restaurants', 'Breakfast|Lunch|Dinner|Buffet|Family dining|Private dining'),
    sub('Cafes', 'Coffee|Tea|Snacks|Desserts|Work-friendly seating|Outdoor seating'),
    sub('Fast food', 'Burgers|Pizza|Sandwiches|Momos|Rolls|Combo meals'),
    sub('Bakeries', 'Fresh bread|Birthday cakes|Custom cakes|Pastries|Cookies|Eggless cakes'),
    sub('Sweet shops', 'Mithai|Namkeen|Gift boxes|Festival orders|Dry fruit sweets'),
    sub('Dhabas', 'North Indian meals|Tandoori items|Thali|Highway parking'),
    sub('Ice cream and juice', 'Ice cream|Shakes|Fresh juice|Kulfi|Faluda'),
    sub('Caterers', 'Wedding catering|Corporate catering|Tiffin service|Live counters|Birthday catering'),
  ], [
    multi('cuisines', 'Cuisines', ['North Indian', 'South Indian', 'Chinese', 'Mughlai', 'Italian', 'Continental', 'Fast food', 'Bakery', 'Street food', 'Seafood', 'Rajasthani', 'Gujarati', 'Bengali', 'Punjabi']),
    select('food_type', 'Food type', ['Pure vegetarian', 'Vegetarian and non-vegetarian', 'Non-vegetarian']),
    number('cost_for_two', 'Average cost for two', '₹', 'e.g. 600'),
    number('seats', 'Seating capacity', 'seats', 'e.g. 40'),
    text('menu_highlights', 'Popular dishes', 'e.g. Paneer tikka, cold coffee'),
  ]),
  category('healthcare', 'Healthcare', 'stethoscope', 'Consultation|Health check-up|Home visit|Online consultation|Vaccination', [
    sub('Doctors and clinics', 'General physician|Fever and infection care|Diabetes care|Blood pressure care|Follow-up consultation', [text('speciality', 'Speciality', 'e.g. General medicine')]),
    sub('Dentists', 'Dental check-up|Teeth cleaning|Root canal treatment|Tooth extraction|Braces and aligners|Dental implants|Teeth whitening'),
    sub('Hospitals', 'Emergency care|OPD|ICU|Surgery|Maternity care|Ambulance', [number('beds', 'Number of beds', 'beds', 'e.g. 50'), select('emergency', '24x7 emergency', ['Yes', 'No'])]),
    sub('Diagnostic labs', 'Blood tests|X-ray|Ultrasound|ECG|Home sample collection|Full body check-up'),
    sub('Pharmacies', 'Prescription medicines|Home delivery|Surgical items|Baby care products'),
    sub('Physiotherapy', 'Back pain therapy|Sports injury care|Post-surgery rehab|Home physiotherapy'),
    sub('Eye care', 'Eye check-up|Spectacles|Contact lenses|Cataract surgery'),
    sub('Skin and hair clinics', 'Acne treatment|Hair fall treatment|Laser hair removal|Pigmentation care'),
    sub('Gynaecology and child care', 'Pregnancy care|Gynaecology consultation|Paediatric consultation|Child vaccination'),
    sub('Ayurveda and homeopathy', 'Ayurvedic consultation|Panchakarma|Homeopathic consultation'),
    sub('Veterinary', 'Pet consultation|Pet vaccination|Pet surgery|Home visit for pets'),
  ], [
    text('qualification', 'Doctor’s qualification', 'e.g. MBBS, MD'),
    number('experience_years', 'Experience', 'years', 'e.g. 12'),
    text('registration_no', 'Medical registration number', 'As on the council certificate'),
    number('consultation_fee', 'Consultation fee', '₹', 'e.g. 500'),
    multi('consult_languages', 'Consultation mode', ['At clinic', 'Home visit', 'Video call', 'Phone call']),
  ]),
  category('education', 'Education', 'graduation-cap', 'Admissions open|Demo class|Online classes|Career counselling', [
    sub('Schools', 'School admission|Transport facility|Hostel facility|Sports|Smart classrooms|Day boarding', [
      multi('board', 'Board', ['CBSE', 'ICSE', 'State board', 'IB', 'Cambridge (IGCSE)', 'NIOS']),
      multi('classes', 'Classes offered', ['Nursery', 'KG', 'Class 1–5', 'Class 6–8', 'Class 9–10', 'Class 11–12']),
      select('school_type', 'School type', ['Co-educational', 'Boys only', 'Girls only']),
      multi('medium', 'Medium', ['English', 'Hindi', 'Regional language']),
    ]),
    sub('Play schools and day care', 'Play group|Nursery|Day care|Activity classes|CCTV monitoring', [text('age_group', 'Age group', 'e.g. 1.5 to 5 years')]),
    sub('Colleges and institutes', 'Degree courses|Diploma courses|Placement support|Hostel facility', [text('courses', 'Main courses', 'e.g. BCA, BBA, MBA'), text('affiliation', 'Affiliated to', 'University or council')]),
    sub('Coaching classes', 'JEE coaching|NEET coaching|SSC coaching|Bank exam coaching|UPSC coaching|School tuition|Test series', [text('exams', 'Exams prepared for', 'e.g. JEE, NEET')]),
    sub('Computer training', 'Basic computer course|Tally course|Programming course|Digital marketing course|Graphic design course'),
    sub('Language classes', 'Spoken English|IELTS preparation|German classes|French classes|Personality development'),
    sub('Hobby classes', 'Dance classes|Music classes|Drawing classes|Yoga classes|Abacus|Chess coaching'),
    sub('Driving schools', 'Car driving lessons|Two-wheeler lessons|Driving licence help|Pickup and drop'),
  ], [
    number('established_students', 'Students enrolled', 'students', 'e.g. 800'),
    text('fees', 'Fee range', 'e.g. ₹2,000 – ₹5,000 per month'),
  ]),
  category('home-services', 'Home Services', 'wrench', 'Home visit|Same day service|Annual maintenance|Installation|Repairs', [
    sub('AC and appliance repair', 'AC repair|AC installation|AC gas refill|Refrigerator repair|Washing machine repair|Microwave repair|Geyser repair'),
    sub('Plumbers', 'Leak repair|Tap and pipe fitting|Bathroom fitting|Water tank cleaning|Drain cleaning'),
    sub('Electricians', 'Wiring|Switch and fan repair|Inverter installation|MCB repair|Light fitting'),
    sub('Carpenters', 'Furniture repair|Modular furniture|Door and window work|Kitchen woodwork'),
    sub('Painters', 'Home painting|Waterproofing|Texture painting|Wood polishing'),
    sub('Cleaning services', 'Deep home cleaning|Bathroom cleaning|Sofa cleaning|Kitchen cleaning|Office cleaning'),
    sub('Pest control', 'Cockroach control|Termite treatment|Bed bug treatment|Rodent control'),
    sub('Packers and movers', 'Home shifting|Office shifting|Vehicle transport|Packing service|Storage'),
    sub('Interior designers', 'Home interiors|Modular kitchen|False ceiling|3D design|Office interiors'),
    sub('Security and CCTV', 'CCTV installation|Video door phone|Security guards|Biometric systems'),
    sub('Water purifier service', 'RO installation|RO repair|Filter change|Water testing'),
  ], [
    text('areas_covered', 'Areas covered', 'e.g. Sector 62, Indirapuram'),
    number('visit_charge', 'Visiting charge', '₹', 'e.g. 199'),
    select('emergency_service', 'Emergency service', ['Yes', 'No']),
    select('warranty', 'Service warranty', ['No warranty', '7 days', '30 days', '90 days', '1 year']),
  ]),
  category('beauty-wellness', 'Beauty & Wellness', 'sparkles', 'Appointment booking|Home service|Packages|Gift vouchers', [
    sub('Salons', 'Haircut|Hair colouring|Hair spa|Keratin treatment|Beard styling|Facial'),
    sub('Beauty parlours', 'Facial|Waxing|Threading|Manicure|Pedicure|Cleanup|Bleach'),
    sub('Spas and massage', 'Body massage|Head massage|Foot reflexology|Steam bath|Body scrub'),
    sub('Makeup artists', 'Bridal makeup|Party makeup|Engagement makeup|Hair styling'),
    sub('Mehendi artists', 'Bridal mehendi|Arabic mehendi|Party mehendi|Home service'),
    sub('Gyms and fitness', 'Gym membership|Personal training|Zumba|Weight loss programme|CrossFit', [number('monthly_fee', 'Monthly fee', '₹', 'e.g. 1200')]),
    sub('Yoga centres', 'Group yoga|Personal yoga|Online yoga|Meditation'),
    sub('Tattoo studios', 'Custom tattoo|Tattoo removal|Piercing'),
  ], [
    select('serves', 'Serves', ['Men', 'Women', 'Unisex']),
    number('starting_price', 'Starting price', '₹', 'e.g. 150'),
  ]),
  category('automotive', 'Automotive', 'car', 'Pickup and drop|Roadside assistance|Insurance claim help|Free estimate', [
    sub('Car service and repair', 'General service|Engine repair|Car AC repair|Oil change|Wheel alignment|Battery replacement'),
    sub('Bike service and repair', 'Bike service|Engine tuning|Brake repair|Puncture repair'),
    sub('Car wash and detailing', 'Car washing|Interior cleaning|Ceramic coating|Polishing'),
    sub('Denting and painting', 'Dent removal|Full body painting|Scratch repair'),
    sub('Tyres and batteries', 'Tyre replacement|Wheel balancing|Battery sale|Battery charging'),
    sub('Car and bike dealers', 'New vehicles|Used vehicles|Exchange offer|Finance help|Test drive'),
    sub('Spare parts and accessories', 'Car accessories|Seat covers|Music system|Genuine spare parts'),
    sub('Towing and rentals', 'Towing|Car rental|Self-drive cars|Driver on hire'),
  ], [
    multi('vehicle_brands', 'Brands handled', ['Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Honda', 'Toyota', 'Kia', 'Hero', 'Bajaj', 'TVS', 'Royal Enfield', 'All brands']),
    multi('vehicle_types', 'Vehicle types', ['Two-wheeler', 'Car', 'SUV', 'Commercial vehicle', 'Electric vehicle']),
  ]),
  category('shopping', 'Shopping', 'shopping-bag', 'Home delivery|Wholesale|Custom orders|Exchange|Gift wrapping', [
    sub('Clothing stores', 'Men’s wear|Women’s wear|Kids’ wear|Ethnic wear|Tailoring'),
    sub('Footwear', 'Formal shoes|Sports shoes|Sandals|Kids’ footwear'),
    sub('Jewellers', 'Gold jewellery|Silver jewellery|Diamond jewellery|Custom design|Old gold exchange'),
    sub('Grocery and supermarkets', 'Daily groceries|Fruits and vegetables|Dairy products|Home delivery'),
    sub('Mobile and electronics', 'Mobile phones|Mobile repair|Laptops|Televisions|Home appliances'),
    sub('Furniture stores', 'Sofa sets|Beds|Office furniture|Custom furniture'),
    sub('Gift and stationery', 'Gifts|School stationery|Office supplies|Customised gifts'),
    sub('Hardware and building material', 'Sanitary ware|Paints|Tiles|Electrical goods|Cement and steel'),
    sub('Opticians', 'Spectacle frames|Lenses|Eye testing|Sunglasses'),
    sub('Florists', 'Bouquets|Wedding flowers|Same day delivery'),
  ], [
    text('brands', 'Brands sold', 'e.g. Samsung, Sony'),
    select('delivery_radius', 'Home delivery', ['No delivery', 'Within 3 km', 'Within 10 km', 'Across the city', 'All India']),
  ]),
  category('professional-services', 'Professional Services', 'briefcase', 'Consultation|Online meeting|Doorstep service|Free first discussion', [
    sub('Chartered accountants and tax', 'Income tax filing|GST registration|GST return filing|Audit|Accounting'),
    sub('Lawyers', 'Property matters|Family matters|Criminal matters|Civil matters|Legal notice|Notary'),
    sub('Company registration', 'Company registration|MSME registration|Trademark filing|FSSAI licence'),
    sub('Digital marketing', 'SEO|Social media marketing|Google Ads|Content writing|Local business listing'),
    sub('Web and software', 'Website design|App development|Software development|Hosting and support'),
    sub('Printing', 'Visiting cards|Flex and banners|Brochures|Wedding cards|T-shirt printing'),
    sub('Placement and consultancy', 'Job placement|Staffing|Resume writing|Overseas education guidance'),
  ], [
    number('experience_years', 'Experience', 'years', 'e.g. 8'),
    text('qualification', 'Qualification or licence', 'e.g. CA, LLB'),
  ]),
  category('real-estate', 'Real Estate', 'building-2', 'Site visit|Property consulting|Documentation help|Home loan help', [
    sub('Property dealers', 'Buy property|Sell property|Rent property|Plot dealing|Commercial property'),
    sub('Builders and developers', 'Residential projects|Commercial projects|Villa construction|Ready to move homes'),
    sub('PG and hostels', 'Boys PG|Girls PG|Meals included|AC rooms|Single occupancy', [select('pg_for', 'For', ['Boys', 'Girls', 'Co-living']), number('rent_from', 'Rent starting from', '₹ per month', 'e.g. 6000')]),
    sub('Architects and contractors', 'House design|Building construction|Renovation|Vastu consultation'),
  ], [
    multi('deals_in', 'Deals in', ['Residential', 'Commercial', 'Industrial', 'Agricultural land']),
    text('rera_no', 'RERA registration number', 'If registered'),
  ]),
  category('hotels-stay', 'Hotels & Stay', 'hotel', 'Room booking|Free parking|Room service|Airport pickup|Event hosting', [
    sub('Hotels', 'AC rooms|Family rooms|Restaurant|Conference hall|24x7 front desk'),
    sub('Guest houses', 'Budget rooms|Long stay|Home-cooked meals'),
    sub('Resorts', 'Swimming pool|Destination wedding|Weekend packages|Adventure activities'),
    sub('Banquet halls', 'Wedding venue|Birthday parties|Corporate events|In-house catering', [number('guest_capacity', 'Guest capacity', 'guests', 'e.g. 300')]),
  ], [
    number('rooms', 'Number of rooms', 'rooms', 'e.g. 24'),
    number('price_from', 'Room price starting from', '₹ per night', 'e.g. 1500'),
    text('check_in', 'Check-in and check-out', 'e.g. 12 noon / 11 am'),
  ]),
  category('events-weddings', 'Events & Weddings', 'party-popper', 'Custom packages|Advance booking|Outstation events', [
    sub('Event planners', 'Wedding planning|Birthday planning|Corporate events|Decoration'),
    sub('Photographers', 'Wedding photography|Pre-wedding shoot|Videography|Drone shoot|Product photography'),
    sub('Decorators and tent house', 'Tent and furniture|Flower decoration|Stage setup|Lighting'),
    sub('DJ and music', 'DJ service|Live band|Sound system|Dhol'),
    sub('Wedding services', 'Wedding cards|Horse and buggy|Bridal wear on rent|Pandit service'),
  ], [
    number('starting_price', 'Packages starting from', '₹', 'e.g. 15000'),
  ]),
  category('travel-transport', 'Travel & Transport', 'plane', 'Online booking|24x7 support|Group booking', [
    sub('Travel agents', 'Holiday packages|Flight booking|Visa help|Passport help|Hotel booking'),
    sub('Taxi services', 'Local taxi|Outstation taxi|Airport transfer|Monthly rental'),
    sub('Bus and tempo rental', 'Tempo traveller|Bus on rent|School transport|Wedding transport'),
    sub('Courier and logistics', 'Domestic courier|International courier|Part load transport|Warehousing'),
  ]),
  category('finance-insurance', 'Finance & Insurance', 'landmark', 'Free consultation|Doorstep documentation|Online application', [
    sub('Loan consultants', 'Home loan|Personal loan|Business loan|Car loan|Loan against property'),
    sub('Insurance agents', 'Life insurance|Health insurance|Motor insurance|Claim help'),
    sub('Investment advisors', 'Mutual funds|SIP planning|Tax saving|Retirement planning'),
  ], [
    text('registration_no', 'Licence or registration number', 'IRDAI, AMFI or similar'),
  ]),
  category('repairs-tailoring', 'Tailors & Local Repairs', 'scissors', 'Same day delivery|Home pickup|Custom work', [
    sub('Tailors and boutiques', 'Blouse stitching|Suit stitching|Alterations|Designer wear|Uniform stitching'),
    sub('Laundry and dry cleaning', 'Dry cleaning|Wash and iron|Steam press|Home pickup'),
    sub('Watch and shoe repair', 'Watch repair|Battery change|Shoe repair|Bag repair'),
    sub('Computer and mobile repair', 'Laptop repair|Mobile screen replacement|Data recovery|Printer repair'),
    sub('Key makers', 'Duplicate keys|Lock repair|Car key programming'),
  ]),
  category('pets', 'Pets', 'paw-print', 'Home visit|Home delivery', [
    sub('Pet shops', 'Pet food|Pet accessories|Aquariums'),
    sub('Pet grooming and boarding', 'Pet bath|Haircut|Pet boarding|Pet training'),
  ], [
    multi('pet_types', 'Pets handled', ['Dogs', 'Cats', 'Birds', 'Fish', 'Small animals']),
  ]),
  category('agriculture', 'Agriculture & Garden', 'leaf', 'Bulk supply|Home delivery|Site visit', [
    sub('Nurseries and gardening', 'Plants|Landscaping|Garden maintenance|Pots and soil'),
    sub('Farm supplies', 'Seeds|Fertilisers|Pesticides|Farm equipment'),
    sub('Dairy farms', 'Fresh milk|Paneer and curd|Daily delivery'),
  ]),
  category('industry-wholesale', 'Manufacturers & Wholesale', 'package', 'Bulk orders|Custom manufacturing|GST billing|All India supply', [
    sub('Manufacturers', 'Contract manufacturing|Private labelling|Samples available'),
    sub('Wholesalers and distributors', 'Wholesale supply|Distributorship|Credit terms'),
    sub('Industrial suppliers', 'Machinery|Packaging material|Safety equipment|Tools and hardware'),
  ], [
    text('products', 'Main products', 'e.g. Corrugated boxes'),
    number('min_order', 'Minimum order value', '₹', 'e.g. 10000'),
  ]),
  category('community', 'Community & Religious', 'users', 'Volunteering|Donations accepted|Hall booking', [
    sub('NGOs', 'Education support|Health camps|Women welfare|Animal welfare'),
    sub('Religious places', 'Daily prayers|Festival events|Community kitchen'),
    sub('Libraries and study rooms', 'Reading room|Book lending|AC study space|Wi-Fi', [number('monthly_fee', 'Monthly fee', '₹', 'e.g. 900')]),
  ]),
];
