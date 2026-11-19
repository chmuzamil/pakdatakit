<?php

// Messages for the PakDataKit validation rules. Publish and edit them with
// `php artisan vendor:publish --tag=pakdatakit-lang`.

return [
    'pk_cnic' => 'The :attribute field must be a valid CNIC.',
    'pk_phone' => 'The :attribute field must be a valid Pakistani mobile number.',
    'pk_iban' => 'The :attribute field must be a valid Pakistani IBAN.',
    'pk_ntn' => 'The :attribute field must be a valid NTN.',
    'pk_strn' => 'The :attribute field must be a valid STRN.',
    'pk_landline' => 'The :attribute field must be a valid Pakistani landline number.',
    'pk_passport' => 'The :attribute field must be a valid Pakistani passport number.',
    'pk_vehicle_plate' => 'The :attribute field must be a valid vehicle registration number.',
    'pk_electricity_ref' => 'The :attribute field must be a valid electricity bill reference number.',
    'pk_cod_phone' => 'The :attribute field must be a mobile number a courier can call.',
    'pk_amount' => 'The :attribute field must be an amount in rupees, like 150,000 or 1.5 lakh.',
];
