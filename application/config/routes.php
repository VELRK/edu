<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
| -------------------------------------------------------------------------
| URI ROUTING
| -------------------------------------------------------------------------
| This file lets you re-map URI requests to specific controller functions.
|
| Typically there is a one-to-one relationship between a URL string
| and its corresponding controller class/method. The segments in a
| URL normally follow this pattern:
|
|	example.com/class/method/id/
|
| In some instances, however, you may want to remap this relationship
| so that a different class/function is called than the one
| corresponding to the URL.
|
| Please see the user guide for complete details:
|
|	https://codeigniter.com/userguide3/general/routing.html
|
| -------------------------------------------------------------------------
| RESERVED ROUTES
| -------------------------------------------------------------------------
|
| There are three reserved routes:
|
|	$route['default_controller'] = 'welcome';
|
| This route indicates which controller class should be loaded if the
| URI contains no data. In the above example, the "welcome" class
| would be loaded.
|
|	$route['404_override'] = 'errors/page_missing';
|
| This route will tell the Router which controller/method to use if those
| provided in the URL cannot be matched to a valid route.
|
|	$route['translate_uri_dashes'] = FALSE;
|
| This is not exactly a route, but allows you to automatically route
| controller and method names that contain dashes. '-' isn't a valid
| class or method name character, so it requires translation.
| When you set this option to TRUE, it will replace ALL dashes in the
| controller and method URI segments.
|
| Examples:	my-controller/index	-> my_controller/index
|		my-controller/my-method	-> my_controller/my_method
*/
$route['default_controller'] = 'Home';

// ── TNPSC API Routes ──────────────────────────────────────────────────────────

// Auth (OTP-based)
$route['api/auth/send-otp']   = 'Tnpsc/auth_send_otp';
$route['api/auth/verify-otp'] = 'Tnpsc/auth_verify_otp';
$route['api/auth/logout']     = 'Tnpsc/auth_logout';
$route['api/auth/login']      = 'Tnpsc/auth_login';
$route['api/auth/register']   = 'Tnpsc/auth_register';

// Topics (public)
$route['api/topics/(:any)/questions'] = 'Tnpsc/topic_questions/$1';
$route['api/topics/(:any)']           = 'Tnpsc/topic/$1';
$route['api/topics']                  = 'Tnpsc/topics';

// Dashboard (public)
$route['api/dashboard/counts'] = 'Tnpsc/dashboard_counts';

// PYQ public
$route['api/pyq/years']     = 'Tnpsc/pyq_years';
$route['api/pyq/questions'] = 'Tnpsc/pyq_questions';
$route['api/pyq2/years']    = 'Tnpsc/pyq2_years';
$route['api/pyq2/questions']= 'Tnpsc/pyq2_questions';

// Subjects (protected)
$route['api/subjects/(:any)/topics'] = 'Tnpsc/subjects_topics/$1';
$route['api/subjects']               = 'Tnpsc/subjects';

// User (protected)
$route['api/user/profile']                     = 'Tnpsc/user_profile';
$route['api/user/progress']                    = 'Tnpsc/user_progress';
$route['api/user/stats']                       = 'Tnpsc/user_stats';
$route['api/user/wrong-answers/(:num)/master'] = 'Tnpsc/wrong_answers_master/$1';
$route['api/user/wrong-answers']               = 'Tnpsc/wrong_answers';
$route['api/user/srs/due']                     = 'Tnpsc/srs_due';
$route['api/user/srs/review']                  = 'Tnpsc/srs_review';
$route['api/user/srs/stats']                   = 'Tnpsc/srs_stats';
$route['api/user/bookmarks/(:num)']            = 'Tnpsc/bookmarks_item/$1';
$route['api/user/bookmarks']                   = 'Tnpsc/bookmarks';
$route['api/user/activity']                    = 'Tnpsc/user_activity';
$route['api/user/streak']                      = 'Tnpsc/user_streak';
$route['api/user/goals']                       = 'Tnpsc/user_goals';
$route['api/user/analysis/weak-topics']        = 'Tnpsc/analysis_weak_topics';
$route['api/user/analysis/recommendations']    = 'Tnpsc/analysis_recommendations';
$route['api/user/analytics']                   = 'Tnpsc/user_analytics';

// Exam attempts (protected)
$route['api/exam-attempts'] = 'Tnpsc/exam_attempts';

// Mock tests (protected)
$route['api/mock-tests/generate']       = 'Tnpsc/mock_generate';
$route['api/mock-tests/(:num)/submit']  = 'Tnpsc/mock_submit/$1';
$route['api/mock-tests/(:num)']         = 'Tnpsc/mock_get/$1';
$route['api/mock-tests']                = 'Tnpsc/mock_list';

// PYQ2 attempts (protected)
$route['api/pyq2/attempts/(:num)/submit'] = 'Tnpsc/pyq2_attempt_submit/$1';
$route['api/pyq2/attempts']               = 'Tnpsc/pyq2_attempt_start';
$route['api/pyq2/history/(:num)']         = 'Tnpsc/pyq2_history_detail/$1';
$route['api/pyq2/history']                = 'Tnpsc/pyq2_history';
$route['404_override'] = '';
$route['translate_uri_dashes'] = FALSE;

// Additional routes
$route['home'] = 'Home/index';
$route['listing'] = 'Listing/index';
$route['listing/search'] = 'Listing/search';
// $route['about'] = 'About/index'; // Commented out - using Home/about instead
$route['blog'] = 'Blog/index';
$route['blog/post/(:any)'] = 'Blog/post/$1';
$route['blog/create'] = 'Blog/create';
$route['blog/edit/(:num)'] = 'Blog/edit/$1';
$route['blog/delete/(:num)'] = 'Blog/delete/$1';
$route['blog/manage'] = 'Blog/manage';
$route['blog/search'] = 'Blog/search';
$route['contact'] = 'Contact/index';
$route['blog-detail'] = 'Blog_detail/index';
$route['property-detail'] = 'Property_detail/index';
$route['property-detail/(:any)'] = 'Property_detail/index/$1';
// Support for old HTML file names
$route['property-details-v1'] = 'Property_detail/index';
$route['property-details-v1/(:any)'] = 'Property_detail/index/$1';
$route['property-details-v2'] = 'Property_detail/index';
$route['property-details-v2/(:any)'] = 'Property_detail/index/$1';
$route['property-details-v3'] = 'Property_detail/index';
$route['property-details-v3/(:any)'] = 'Property_detail/index/$1';
$route['property-details-v4'] = 'Property_detail/index';
$route['property-details-v4/(:any)'] = 'Property_detail/index/$1';
$route['login'] = 'Login/index';
$route['register'] = 'Register/index';

// Auth shortcuts (same as api/auth/*)
$route['auth/send-otp']   = 'Tnpsc/auth_send_otp';
$route['auth/verify-otp'] = 'Tnpsc/auth_verify_otp';
$route['test-update'] = 'TestUpdate/index';

// Service Worker routes
$route['firebase-messaging-sw.js'] = 'ServiceWorker/firebase_messaging_sw';

// API routes
$route['api/enquiry_store'] = 'Api/enquiry_store';
$route['api/enquiry/store'] = 'Api/enquiry_store';
$route['api/wishlist/store'] = 'Api/wishlist_store';
$route['api/wishlist/check'] = 'Api/wishlist_check';
$route['api/track_video_play'] = 'Api/track_video_play';
$route['api/video/play'] = 'Api/track_video_play';

// Dashboard routes
$route['dashboard/wishlist'] = 'Dashboard/wishlist';
$route['dashboard/enquiries'] = 'Dashboard/enquiries';

// Admin routes
$route['admin'] = 'Admin/index';
$route['admin/login'] = 'Admin/login';
$route['admin/dashboard'] = 'Admin/dashboard';
$route['admin/enquiries'] = 'Admin/enquiries';
$route['admin/contacts'] = 'Admin/contacts';
$route['admin/logout'] = 'Admin/logout';
$route['admin/clear-cache'] = 'Admin/clear_cache_public';
$route['clear-cache'] = 'Admin/clear_cache_public';


$route['404_override'] = '';
$route['translate_uri_dashes'] = FALSE;

// Additional routes
$route['about'] = 'About/index';
$route['properties'] = 'Home/properties';
$route['listing'] = 'Listing/index';
$route['blog'] = 'Blog/index';
$route['blog/detail/(:num)'] = 'Blog/detail/$1';
$route['blog/(:num)'] = 'Blog/detail/$1';
$route['contact'] = 'Contact/index';
$route['contact/submit'] = 'Contact/submit';
// Property routes - support both slug and ID for backward compatibility
$route['property/(:any)'] = 'Home/property_detail/$1';
$route['property-detail/(:any)'] = 'Home/property_detail/$1';
$route['privacy-policy'] = 'Home/privacy_policy';
$route['terms-conditions'] = 'Home/terms_conditions';
$route['testimonials'] = 'Home/testimonials';

// Admin routes
$route['admin'] = 'Admin/login';
$route['admin/login'] = 'Admin/login';
$route['admin/logout'] = 'Admin/logout';
$route['admin/dashboard'] = 'Admin/dashboard';
$route['admin/properties'] = 'Admin/properties';
$route['admin/property_create'] = 'Admin/property_create';
$route['admin/property_edit/(:num)'] = 'Admin/property_edit/$1';
$route['admin/property_delete/(:num)'] = 'Admin/property_delete/$1';
$route['admin/banners'] = 'Admin/banners';
$route['admin/offer_banners'] = 'Admin/offer_banners';
$route['admin/offer_banner_create'] = 'Admin/offer_banner_create';
$route['admin/offer_banner_edit/(:num)'] = 'Admin/offer_banner_edit/$1';
$route['admin/offer_banner_delete/(:num)'] = 'Admin/offer_banner_delete/$1';
$route['admin/banner_create'] = 'Admin/banner_create';
$route['admin/banner_edit/(:num)'] = 'Admin/banner_edit/$1';
$route['admin/banner_delete/(:num)'] = 'Admin/banner_delete/$1';
$route['admin/banner_toggle/(:num)'] = 'Admin/banner_toggle/$1';
$route['admin/enquiries'] = 'Admin/enquiries';
$route['admin/enquiry_view/(:num)'] = 'Admin/enquiry_view/$1';
$route['admin/enquiry_delete/(:num)'] = 'Admin/enquiry_delete/$1';
$route['admin/contacts'] = 'Admin/contacts';
$route['admin/contact_view/(:num)'] = 'Admin/contact_view/$1';
$route['admin/contact_delete/(:num)'] = 'Admin/contact_delete/$1';
$route['admin/cities'] = 'Admin/cities';
$route['admin/city_create'] = 'Admin/city_create';
$route['admin/city_edit/(:num)'] = 'Admin/city_edit/$1';
$route['admin/city_delete/(:num)'] = 'Admin/city_delete/$1';
$route['admin/locations'] = 'Admin/locations';
$route['admin/location_create'] = 'Admin/location_create';
$route['admin/location_edit/(:num)'] = 'Admin/location_edit/$1';
$route['admin/location_delete/(:num)'] = 'Admin/location_delete/$1';
$route['admin/blogs'] = 'Admin/blogs';
$route['admin/blog_create'] = 'Admin/blog_create';
$route['admin/blog_edit/(:num)'] = 'Admin/blog_edit/$1';
$route['admin/blog_delete/(:num)'] = 'Admin/blog_delete/$1';

// API routes
$route['property/store'] = 'Property/store';
$route['contact/save'] = 'Contact/save';
$route['enquiry/save'] = 'Enquiry/save';
$route['property_search/filter'] = 'Property_search/filter';

// Mobile API routes
$route['api/mobile/home'] = 'Api_mobile/home';
$route['api/mobile/properties'] = 'Api_mobile/properties';
$route['api/mobile/properties/featured'] = 'Api_mobile/featured_properties';
$route['api/mobile/properties/latest'] = 'Api_mobile/latest_properties';
$route['api/mobile/properties/search'] = 'Api_mobile/search_properties';
$route['api/mobile/properties/(:num)'] = 'Api_mobile/property/$1';
$route['api/mobile/blogs'] = 'Api_mobile/blogs';
$route['api/mobile/blogs/(:num)'] = 'Api_mobile/blog/$1';
$route['api/mobile/categories'] = 'Api_mobile/categories';
$route['api/mobile/categories/(:num)'] = 'Api_mobile/category/$1';
$route['api/mobile/cities'] = 'Api_mobile/cities';
$route['api/mobile/cities/(:num)'] = 'Api_mobile/city/$1';
$route['api/mobile/locations'] = 'Api_mobile/locations';
$route['api/mobile/locations/(:num)'] = 'Api_mobile/location/$1';
$route['api/mobile/locations/city/(:num)'] = 'Api_mobile/locations_by_city/$1';
$route['api/mobile/banners'] = 'Api_mobile/banners';
$route['api/mobile/offer_banner'] = 'Api_mobile/offer_banner';
$route['api/mobile/offer_banners'] = 'Api_mobile/offer_banners';
$route['api/mobile/contact'] = 'Api_mobile/contact';
$route['api/mobile/enquiry'] = 'Api_mobile/enquiry';
$route['api/mobile/enquiries/customer/(:num)'] = 'Api_mobile/enquiries_by_customer/$1';
$route['api/mobile/enquiries_by_customer/(:num)'] = 'Api_mobile/enquiries_by_customer/$1';

// Mobile API Authentication Routes
$route['api/mobile/send_otp'] = 'Api_mobile/send_otp';
$route['api/mobile/send-otp'] = 'Api_mobile/send_otp';
$route['api/mobile/verify_otp'] = 'Api_mobile/verify_otp';
$route['api/mobile/verify-otp'] = 'Api_mobile/verify_otp';
$route['api/mobile/resend_otp'] = 'Api_mobile/resend_otp';
$route['api/mobile/resend-otp'] = 'Api_mobile/resend_otp';
$route['api/mobile/save_profile'] = 'Api_mobile/save_profile';
$route['api/mobile/save-profile'] = 'Api_mobile/save_profile';
$route['api/mobile/update_profile'] = 'Api_mobile/update_profile';
$route['api/mobile/update-profile'] = 'Api_mobile/update_profile';
$route['api/mobile/profile'] = 'Api_mobile/profile';
$route['api/mobile/check'] = 'Api_mobile/check';
$route['api/mobile/check_auth'] = 'Api_mobile/check';
$route['api/mobile/check-auth'] = 'Api_mobile/check';
$route['api/mobile/refresh_session'] = 'Api_mobile/refresh_session';
$route['api/mobile/refresh-session'] = 'Api_mobile/refresh_session';
$route['api/mobile/logout'] = 'Api_mobile/logout';
$route['api/mobile/check_phone_exists'] = 'Api_mobile/check_phone_exists';
$route['api/mobile/check-phone-exists'] = 'Api_mobile/check_phone_exists';
$route['api/mobile/check-phone'] = 'Api_mobile/check_phone_exists';
$route['api/mobile/change_phone'] = 'Api_mobile/change_phone';
$route['api/mobile/change-phone'] = 'Api_mobile/change_phone';
$route['api/mobile/verify_phone_change'] = 'Api_mobile/verify_phone_change';
$route['api/mobile/verify-phone-change'] = 'Api_mobile/verify_phone_change';
$route['api/mobile/delete_account'] = 'Api_mobile/delete_account';
$route['api/mobile/delete-account'] = 'Api_mobile/delete_account';
