/*!
 * validation.js - JavaScript form validation library
 * http://github.com/dbabaioff/validation.js
 */
var Validation = (typeof module !== "undefined" && module.exports) || {};

(function (Validation) {
    var Rules = (function() {
        var rules = {
            numeric: /^[0-9]+$/,
            integer: /^\-?[0-9]+$/,
            decimal: /^\-?[0-9]*\.?[0-9]+$/,
            email: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,6}$/i,
            alpha: /^[a-z]+$/i,
            alphaNumeric: /^[a-z0-9]+$/i,
            alphaDash: /^[a-z0-9_-]+$/i,
            natural: /^[0-9]+$/i,
            naturalNoZero: /^[1-9][0-9]*$/i,
            ip: /^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})$/i,
            base64: /[^a-zA-Z0-9\/\+=]/i,
            url: [
                /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i,
                /(^|[^\/])(www\.[\S]+(\b|$))/i
            ]
        };

        /*
         * Object containing all of the validation hooks
         */
        return {
            required: function(field) {
                var value = field.elem.value;

                if (field.elem.type === 'checkbox') {
                    return (field.elem.checked === true);
                }
                else if (field.elem.type === 'select-one') {
                    return (field.elem.value !== '0');
                }

                return (value !== null && _trim(value) !== '');
            },

            matches: function(field, matchField) {
                return field.elem.value === field.form[matchField].value;
            },

            email: function(field) {
                return rules.email.test(field.elem.value);
            },

            emails: function(field) {
                var result = field.elem.value.split(',');

                for (var i = 0; i < result.length; i++) {
                    if (! rules.email.test(result[i])) {
                        return false;
                    }
                }

                return true;
            },

            min_length: function(field, length) {
                return (field.elem.value.length >= length);
            },

            max_length: function(field, length) {
                return (field.elem.value.length <= length);
            },

            exact_length: function(field, length) {
                return (field.elem.value.length == length);
            },

            greater_than: function(field, param) {
                return (field.elem.value > param);
            },

            less_than: function(field, param) {
                return (field.elem.value < param);
            },

            between: function(field, param) {
                var range = param.split(','),
                    value = '' + field.elem.value;

                return (value.length >= (1 * range[0]) && value.length <= (1 * range[1]));
            },

            alpha: function(field) {
                return (rules.alpha.test(field.elem.value));
            },

            alpha_numeric: function(field) {
                return (rules.alphaNumeric.test(field.elem.value));
            },

            alpha_dash: function(field) {
                return (rules.alphaDash.test(field.elem.value));
            },

            numeric: function(field) {
                return (rules.decimal.test(field.elem.value));
            },

            integer: function(field) {
                return (rules.integer.test(field.elem.value));
            },

            decimal: function(field) {
                return (rules.decimal.test(field.elem.value));
            },

            is_natural: function(field) {
                return (rules.natural.test(field.elem.value));
            },

            is_natural_no_zero: function(field) {
                return (rules.naturalNoZero.test(field.elem.value));
            },

            ip: function(field) {
                return (rules.ip.test(field.elem.value));
            },

            base64: function(field) {
                return (rules.base64.test(field.elem.value));
            },

            url: function(field) {
                if (! _trim(field.elem.value)) {
                    return true;
                }

                return (rules.url[0].test(field.elem.value) || rules.url[1].test(field.elem.value));
            }
        };
    }());

    var Form = function(form, fields, handlers) {
        this.elem = form;
        this.fields = fields;
        this.handlers = handlers;
        this.isValid = null;
    };

    Form.prototype = {
        /**
         * Runs the validation
         * @public
         */
        check: function() {
            if (! this.elem) {
                return true;
            }

            var fields = this.fields;

            // reset (=true) the form valid status
            this.isValid = true;

            this.handlers.onPreCheck.call(this, Field.format(fields));

            for (var i = 0, length = fields.length; i < length; i++) {
                var element = fields[i].elem;
                if (typeof element === 'undefined' || element.disabled) {
                    continue;
                }

                // Run through the rules for each field.
                if (! fields[i].validate()) {
                    this.isValid = false;
                }
            }

            this.handlers.onPostCheck.call(this, Field.format(fields));
            this.handlers.onFormCheck.call(this, Form.format(this));

            console.log(this.isValid);

            return this.isValid;
        },

        // For internal use only.
        _checkField: function(field) {
            field.validate();
            this.handlers.onFieldCheck.call(this, Field.format(field));

            return field.isValid;
        },

        // For internal use only.
        _findField: function(name) {
            this.cache = this.cache || {};

            if (this.cache[name]) {
                return this.cache[name];
            }

            var field = {};

            for (var i = 0, length = this.fields.length; i < length; i++) {
                if (this.fields[i].name === name) {
                    field = this.fields[i];

                    break;
                }
            }

            return (this.cache[name] = field);
        }
    };

    Form.format = function(form) {
        return {
            elem: form.elem,
            isValid: form.isValid
        };
    };

    var Field = function(field) {
        this.name = field.name;
        this.elem = field.elem;
        this.form = field.form;
        this.rules = field.rules;
        this.messages = field.messages;
        this.options = field.options;
        this.errorIndex = -1; // rules/messages array index - that didn't pass validation
        this.validated = false; // if the field has been validated
        this.isValid = true;
    };

    Field.prototype = {
        /**
         * Looks at the field value and evaluates it against the given rules
         * @param updateValidated
         * @return {*}
         * @public
         */
        validate: function(updateValidated) {
            updateValidated = (typeof updateValidated !== 'undefined') ? updateValidated : true;

            this.isValid = true;

            // Run through the rules and execute the validation methods as needed
            for (var i = 0, length = this.rules.length; i < length; i++) {
                var method = this.rules[i],
                    param = null,
                    parts;

                if (_isFunc(method)) {
                    if (! method.call(this.elem)) {
                        this.isValid = false;
                        this.errorIndex = i;
                        break;
                    }
                }
                else {
                    // If the rule has a parameter (i.e. matches[param]) split it out
                    if (parts = /^(.+)\[(.+)\]$/.exec(method)) {
                        method = parts[1];
                        param = parts[2];
                    }

                    // If the hook is defined, run it to find any validation errors
                    if (_isFunc(Rules[method])) {
                        if (! Rules[method](this, param)) {
                            this.isValid = false;
                            this.errorIndex = i;
                            // Break out so as to not spam with validation errors (i.e. required and valid_email)
                            break;
                        }
                    }
                }
            }

            if (updateValidated) {
                this.validated = true;
            }

            return this.isValid;
        }
    };

    Field.defaults = {
        onkeyup: true,
        onfocusout: true
    };

    Field.format = function(fields) {
        fields = _isArray(fields) ? fields : [fields];

        var results = [];

        for (var i = 0, length = fields.length; i < length; i++) {
            results.push({
                elem: fields[i].elem,
                isValid: fields[i].isValid,
                message: fields[i].messages[fields[i].errorIndex] || ''
            });
        }

        return (results.length === 1 ? results[0] : results);
    };

    /**
     * Validation
     */
    Validation.name = 'validation.js';
    Validation.version = '0.3';

    // Default handlers
    Validation.handlers = {
        onPreCheck: function() {},

        onPostCheck: function(fields) {
            for (var i = 0; i < fields.length; i++) {
                Validation.styler.field(fields[i]);
            }
        },

        onFieldCheck: function(field) {
            Validation.styler.field(field[0]);
        },

        onFormCheck: function(form) {
            Validation.styler.form(form);
        }
    };

    // Default stylers function
    Validation.styler = {
        form : function(form) {},
        field: function(field) {}
    };

    /*
     * @public
     * Init the validation
     */
    Validation.init = function(form, fields, handlers) {
        // Process an array of fields and build a form tree
        var buildFormTree = function(form, fields, handlers) {
            if (typeof form === 'string') {
                form = document.forms[form];
            }

            // Check if the form exist
            if (typeof form === 'undefined') {
                form = null;
            }

            var formTree = {
                form: form,
                fields: [],
                handlers: $.extend({}, this.handlers, handlers)
            };

            for (var i = 0, length = fields.length; i < length; i++) {
                // If passed in incorrectly, we need to skip the field.
                if (! fields[i].name) {
                    continue;
                }

                var names = (_isArray(fields[i].name)) ? fields[i].name : [fields[i].name];
                for (var j = 0, _length = names.length; j < _length; j++) {
                    // If the field does not exist - skip the field.
                    if (! form[names[j]]) {
                        continue;
                    }

                    // Build the master fields array that has all the information needed to validate
                    formTree.fields.push(new Field({
                        name: names[j],
                        elem: form[names[j]],
                        form: form,
                        rules: (_isArray(fields[i].rules)) ? fields[i].rules : [fields[i].rules],
                        messages: (_isArray(fields[i].messages)) ? fields[i].messages : [fields[i].messages],
                        options: $.extend({}, Field.defaults, fields[i].options)
                    }));
                }
            }

            return formTree;
        };

        var formTree = buildFormTree.call(this, form, fields, handlers),
            formObj = new Form(formTree.form, formTree.fields, formTree.handlers);

        return formObj;
    };

    Validation.rules = function(rules) {
        Rules = $.extend({}, Rules, rules);

        return this;
    };

    /**
     * Private methods
     */
    var _trim = String.prototype.trim ?
        function(text) {
            return text == null ?
                '' :
                String.prototype.trim.call(text);
        } :

        // Otherwise use our own trimming functionality
        function( text ) {
            return text == null ?
                '' :
                text.toString().replace(/^\s+/, '').replace(/\s+$/, '');
        };

    var _isArray = function(obj) {
        return (Object.prototype.toString.call(obj) === '[object Array]');
    };

    var _isFunc = function(func) {
        return (Object.prototype.toString.call(func) === '[object Function]');
    };
}(Validation));


/**
 * ValidationEvent
 */
var ValidationEvent = (typeof module !== "undefined" && module.exports) || {};

(function(ValidationEvent) {
    ValidationEvent.init = function(form, fields, handlers) {
        var formObj = Validation.init(form, fields, handlers);

        if (! formObj.elem) {
            return formObj;
        }

        var eventHandler = function(event) {
            var target = $(event.target);

            if (target.is(event.data._target)) {
                var field = formObj._findField(target.attr('name'));

                if ($.isEmptyObject(field)) {
                    return;
                }

                if (event.type === 'keyup') {
                    if (field.options.onkeydown === false) {
                        return;
                    }

                    if (field.validated) {
                        formObj._checkField(field);
                    }
                }
                else if (event.type === 'focusout') {
                    if (field.options.onfocusout === false) {
                        return;
                    }

                    formObj._checkField(field);
                }
                else { // click
                    formObj._checkField(field);
                }
            }
        };

        // Bind - submit event
        $(formObj.elem).submit(function(event) {
            return formObj.check();
        })
        .bind('focusout keyup', {_target: ':text, [type="password"], [type="file"], select, textarea'}, eventHandler)
        .bind('click', {_target: '[type="radio"], [type="checkbox"]'}, eventHandler);

        return formObj;
    };
}(ValidationEvent));
