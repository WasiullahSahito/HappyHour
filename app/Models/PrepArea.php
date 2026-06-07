<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PrepArea extends Model
{
    use SoftDeletes;
    //
    protected $fillable = [
        'name',
        'status',
        'description',
    ];




}
