/**
 * メイン Controller
 */
Ext.define(
    'sop_mng.controller.Main', {
        extend: 'Ext.app.Controller',
        refs: [{
                ref: 'LoginForm',
                selector: '#login_form'
            },

            {
                ref: 'GrpGrid',
                selector: 'grp-grid'
            }, {
                ref: 'GrpForm',
                selector: '#grp_form'
            },

            {
                ref: 'UserGrid',
                selector: 'user-grid'
            }, {
                ref: 'UserForm',
                selector: '#user_form'
            }, {
                ref: 'PasswordForm',
                selector: '#password_form'
            }
        ],

        init: function() {

            this.on('updgrp', this.updGrp);
            this.on('delgrp', this.delGrp);

            this.on('upduser', this.updUser);
            this.on('deluser', this.delUser);

            this.on('updpwd', this.updPassword);

            this.control({
                '#user_id_field': {
                    specialkey: this.onTextfieldSpecialKey
                },
                '#password_field': {
                    specialkey: this.onTextfieldSpecialKey
                },
                '#login_btn': {
                    click: this.onClickLoginBtn
                },
                '#logout_btn': {
                    click: this.onClickLogoutBtn
                },

                '#grp_add_menu': {
                    click: this.onClickGrpAddMenu
                },
                '#grp_upd_menu': {
                    click: this.onClickGrpUpdMenu
                },
                '#grp_del_menu': {
                    click: this.onClickGrpDelMenu
                },

                '#grp_submit_btn': {
                    click: this.onClickGrpSubmitBtn
                },
                '#grp_cancel_btn': {
                    click: this.onClickGrpCancelBtn
                },

                '#user_add_menu': {
                    click: this.onClickUserAddMenu
                },
                '#user_upd_menu': {
                    click: this.onClickUserUpdMenu
                },
                '#user_del_menu': {
                    click: this.onClickUserDelMenu
                },
                '#user_pwd_menu': {
                    click: this.onClickUserPwdMenu
                },

                '#user_submit_btn': {
                    click: this.onClickUserSubmitBtn
                },
                '#user_cancel_btn': {
                    click: this.onClickUserCancelBtn
                },

                '#pwd_submit_btn': {
                    click: this.onClickPwdSubmitBtn
                },
                '#pwd_cancel_btn': {
                    click: this.onClickPwdCancelBtn
                },

                '#user_form #role_aprv': {
                    change: this.onChangeRoleAprvCheckbox
                }
            });
        },

        onLaunch: function() {
            Ext.ComponentQuery.query('app-main')[0].hide();
            this.getLoginForm().alignTo(document.body, 'c-c');
            this.getLoginForm().getForm().owner.up('panel').hide();

            var that = this;
            Ext.getStore('SystemConfigStore').load(function(records, operation, success) {
                var system_version = records[0].get('system_version');
                sop.common.SystemVersion.check(system_version);
                that.getLoginForm().query('#system_version_field')[0].update('<div style="text-align:right; padding-bottom: 1em; font-size: 80%; color: gray">System Version ' + system_version + '</div>'); // システムバージョン

                var header_home_button_url = records[0].get('header_home_button_url');
                if (header_home_button_url) {
                    Ext.Array.each(Ext.ComponentQuery.query('#header-home-button'),
                        function(component) {
                            component.setHref(header_home_button_url);
                        });
                } else {
                    Ext.Array.each(Ext.ComponentQuery.query('#header-home-button'),
                        function(component) {
                            component.hide();
                        });
                }

                that.checkSession();
            });
        },

        checkSession: function() {
            Ext.Ajax.request({
                url: './src/login_.php',
                timeout: 5000,
                scope: this,
                callback: function(options, success, response) {
                    var json = Ext.JSON.decode(response.responseText);
                    if (json.success == true) {
                        this.onLoginSucceed(this.getLoginForm().getForm(), json);
                        return;
                    }

                    if (json.sso_msg) {
                        Ext.Msg.alert('Failure', json.sso_msg);
                    }

                    this.resetLoginForm();
                    this.getLoginForm().getForm().owner.up('panel').show();
                }
            });
        },

        resetLoginForm: function() {
            this.getLoginForm().getForm().reset();

            var systemConfig = Ext.getStore('SystemConfigStore').getAt(0);
            if (systemConfig.get('use_sso')) {
                // シングル・サインオン用にログインフォームを変更する。

                this.getLoginForm().remove('user_id_field', true);
                this.getLoginForm().remove('password_field', true);
                this.getLoginForm().query('#sso_field')[0].show();
            }
        },

        onLoginSucceed: function(form, params) {
            // ログインパネルを非表示に
            Ext.ComponentQuery.query('#app-login-panel')[0].hide();
            Ext.ComponentQuery.query('app-main')[0].show();

            // ログイン情報表示
            Ext.ComponentQuery.query('#header-group-info')[0].setText(params.grp_name, false);
            Ext.ComponentQuery.query('#header-user-info')[0].setText(params.user_id, false);
            var footer = Ext.getStore('SystemConfigStore').getAt(0).get('footer');
            Ext.ComponentQuery.query('#footer')[0].setText(footer, false);

            // データロード
            Ext.getStore('UserStore').load();
            Ext.getStore('GrpStore').load();

            // SSOの場合は、ユーザー名とメールアドレスは非表示にする。
            var use_sso = Ext.getStore('SystemConfigStore').getAt(0).get('use_sso');
            if (use_sso) {
                Ext.Array.each(this.getUserGrid().columns,
                    function(column) {
                        if (column.dataIndex == 'user_name' ||
                            column.dataIndex == 'email') {
                            column.hide();
                        }
                    });
            }
        },

        // ---------------------------------
        // ログイン画面
        // ---------------------------------
        // --- ログインボタン押下
        onClickLoginBtn: function(btn, e, eopts) {
            var systemConfig = Ext.getStore('SystemConfigStore').getAt(0);
            if (systemConfig.get('use_sso')) {
                window.location.href = '/sop/sso/signin?' + Ext.urlEncode({
                    session_site_key: systemConfig.get('session_site_key'),
                    pathname: window.location.pathname
                });
            } else {
                this.getLoginForm().getForm().submit({
                    url: './src/login_.php',
                    scope: this,
                    success: function(form, action) {
                        this.onLoginSucceed(form, action.result);
                    },
                    failure: function(form, action) {
                        form.reset();
                        if (action.hasOwnProperty('result')) {
                            sop.common.Utilities.showFailureResponse(action.result);
                        } else {
                            Ext.Msg.alert('Failure', 'An unexpected error has occurred: ' + action.failureType); // 予期しないエラーが発生しました:
                        }
                        form.owner.down('#user_id_field').focus();
                    }
                });
            }
        },

        // -------------------------
        // Submit on Enter
        // -------------------------
        onTextfieldSpecialKey: function(field, e, opt) {
            var submitBtn = field.up('[name="submit_form"]').down('button[name="submit_btn"]');
            if (e.getKey() == e.ENTER && submitBtn.disabled == false) {
                submitBtn.fireEvent('click', submitBtn, e, opt);
            }
        },

        // --- ログアウトボタン押下
        onClickLogoutBtn: function(btn, e, eopts) {
            var that = this;
            Ext.MessageBox.confirm('Confirm', 'Are you sure you want to logout?', submit); // ログアウトを行います。よろしいですか？

            function submit(btn) {
                if (btn == 'yes') {
                    Ext.Ajax.request({
                        url: './src/logout_.php',
                        success: function(res, eopts) {
                            Ext.ComponentQuery.query('app-main')[0].hide();
                            that.resetLoginForm();
                            Ext.ComponentQuery.query('#app-login-panel')[0].show();
                            that.getLoginForm().getForm().owner.up('panel').show();

                            var systemConfig = Ext.getStore('SystemConfigStore').getAt(0);
                            if (systemConfig.get('use_sso') && !systemConfig.get('debug_pseudo_sso')) {
                                location.href = systemConfig.get('oauth2_logout_uri');
                            }
                        },
                        failure: function(res, eopts) {
                            Ext.Msg.hide();
                            Ext.Msg.alert('Failure', 'An unexpected error has occurred:' + res.statusText); // 予期しないエラーが発生しました:
                        }
                    });
                }
            }
        },

        // ---------------------------------
        // イベント処理
        // ---------------------------------
        // --- GrpGrid ---------------------
        onClickGrpAddMenu: function(menuitem, e, eopts) {
            this.getGrpForm().getForm().reset();

            this.getGrpForm().up('window').setTitle('Group Registration'); // グループ 登録
            this.getGrpForm().up('window').show();
        },

        onClickGrpUpdMenu: function(menuitem, e, eopts) {
            this.getGrpForm().getForm().reset();

            var row = this.getGrpGrid().getSelectionModel().getSelection()[0];

            this.getGrpForm().query('#grp_id')[0].setValue(row.data.grp_id);
            this.getGrpForm().query('#grp_name')[0].setValue(Ext.util.Format.htmlDecode(row.data.grp_name));

            this.getGrpForm().up('window').setTitle('Group Edit'); // グループ 編集
            this.getGrpForm().up('window').show();
        },

        onClickGrpDelMenu: function(menuitem, e, eopts) {
            var row = this.getGrpGrid().getSelectionModel().getSelection()[0];
            this.fireEvent('delgrp', {
                grp_id: row.data.grp_id
            });
        },

        // --- UserGrid --------------------
        onClickUserAddMenu: function(menuitem, e, eopts) {
            this.getUserForm().getForm().reset();

            this.getUserForm().query('#div')[0].setValue('add');

            this.getUserForm().query('#user_id')[0].enable();

            var systemConfig = Ext.getStore('SystemConfigStore').getAt(0);
            if (systemConfig.get('use_sso')) {
                // シングル・サインオンが有効な場合
                this.getUserForm().remove('password', true);
                this.getUserForm().query('#user_name')[0].hide();
                this.getUserForm().query('#email')[0].hide();
            } else {
                this.getUserForm().query('#password')[0].show();
            }

            this.getUserForm().up('window').setTitle('User Registration'); // ユーザー 登録
            this.getUserForm().up('window').show();
        },

        onClickUserUpdMenu: function(menuitem, e, eopts) {
            this.getUserForm().getForm().reset();

            var row = this.getUserGrid().getSelectionModel().getSelection()[0];

            this.getUserForm().query('#div')[0].setValue('upd');

            var values = {
                '#user_id': row.data.user_id,
                '#user_name': row.data.user_name,
                '#email': row.data.email,
                '#note': row.data.note,
                '#role_aprv': row.data.role_aprv,
                '#role_upld': row.data.role_upld,
                '#role_user': row.data.role_user,
                '#admin_flag': row.data.admin_flag
            };
            for (var k in values) {
                if (k[0] == '#') {
                    this.getUserForm().query(k)[0].setValue(Ext.util.Format.htmlDecode(values[k]));
                }
            }
            // grp_nameはエンコードしたままで扱う。
            // （comboboxはストアの生のデータ（エンコード済）を扱うため。）
            this.getUserForm().query('#grp_name')[0].setValue(row.data.grp_name);

            this.getUserForm().query('#user_id')[0].disable();

            var systemConfig = Ext.getStore('SystemConfigStore').getAt(0);
            if (systemConfig.get('use_sso')) {
                // シングル・サインオンが有効な場合
                this.getUserForm().remove('password', true);
                this.getUserForm().query('#user_name')[0].hide();
                this.getUserForm().query('#email')[0].hide();
            } else {
                this.getUserForm().query('#password')[0].setValue('xxxxxxxxxx'); // arrowBlank 対応
                this.getUserForm().query('#password')[0].hide();
            }

            this.getUserForm().up('window').setTitle('User Edit'); // ユーザー 編集
            this.getUserForm().up('window').center();
            this.getUserForm().up('window').show();
        },

        onClickUserPwdMenu: function(menuitem, e, eopts) {
            this.getPasswordForm().getForm().reset();

            var row = this.getUserGrid().getSelectionModel().getSelection()[0];

            this.getPasswordForm().query('#user_id')[0].setValue(row.data.user_id);
            this.getPasswordForm().query('#password')[0].setValue(row.data.password);

            this.getPasswordForm().query('#user_id')[0].disable();

            var systemConfig = Ext.getStore('SystemConfigStore').getAt(0);

            this.getPasswordForm().up('window').setTitle('Password Change'); // パスワード 変更
            this.getPasswordForm().up('window').center();
            this.getPasswordForm().up('window').show();
        },


        onClickUserDelMenu: function(menuitem, e, eopts) {
            var row = this.getUserGrid().getSelectionModel().getSelection()[0];
            this.fireEvent('deluser', {
                user_id: row.data.user_id
            });
        },

        // --- GrpWindow -------------------
        onClickGrpSubmitBtn: function(btn, e, eopts) {
            this.fireEvent('updgrp', {});
        },

        onClickGrpCancelBtn: function(btn, e, eopts) {
            this.getGrpForm().up('window').hide();
        },

        // --- UserWindow ------------------
        onChangeRoleAprvCheckbox: function(chkbox, newval, oldval, eopts) {
            // 承認権限あり→なしの場合の注意喚起
            var div = this.getUserForm().query('#div')[0].getValue();
            if (div == 'upd') {
                if (this.getUserForm().up('window').isHidden() == false) {
                    if (oldval == true && newval == false) {
                        Ext.MessageBox.alert('Confirm', 'If you undo the check then an approval user might disappear from a group.'); // チェックを外すことで、グループ内に承認者が存在しなくなる可能性があります
                    }
                }
            }
        },

        onClickUserSubmitBtn: function(btn, e, eopts) {
            this.fireEvent('upduser', {});
        },

        onClickUserCancelBtn: function(btn, e, eopts) {
            this.getUserForm().up('window').hide();
        },

        onClickPwdSubmitBtn: function(btn, e, eopts) {
            this.fireEvent('updpwd', {});
        },
        onClickPwdCancelBtn: function(btn, e, eopts) {
            this.getPasswordForm().up('window').hide();
        },

        // ---------------------------------
        // 共通処理
        // ---------------------------------
        // --- Grp 登録 更新
        updGrp: function(args) {
            var waitmsg = '';
            if (this.getGrpForm().query('#grp_id')[0].value == '') {
                Ext.MessageBox.confirm('Confirm', 'Are you sure you want to regist?', submit); // 登録を行います。よろしいですか？
                waitmsg = 'Now Registrating...'; // 登録中です...
            } else {
                Ext.MessageBox.confirm('Confirm', 'Are you sure you want to update?', submit); // 更新を行います。よろしいですか？
                waitmsg = 'Now Updating...'; // 更新中です...
            }

            function submit(btn) {
                if (btn == 'yes') {
                    Ext.ComponentQuery.query('#grp_form')[0].getForm().submit({
                        url: './src/grp_upd.php',
                        waitMsg: waitmsg,
                        success: function(form, action) {
                            form.owner.up('window').hide();
                            Ext.getStore('GrpStore').load();
                            Ext.Msg.alert('Success', action.result.msg);
                        },
                        failure: function(form, action) {
                            if (action.hasOwnProperty('result')) {
                                sop.common.Utilities.showFailureResponse(action.result);
                            } else {
                                Ext.Msg.alert('Failure', action.failureType + ': Please input in required item.'); //: 必須項目の入力を行ってください
                            }
                        }
                    });
                }
            }
        },

        // --- Grp 削除
        delGrp: function(args) {
            Ext.MessageBox.confirm('Confirm', 'Are you sure you want to delete?', submit); // 削除を行います。よろしいですか？

            function submit(btn) {
                if (btn == 'yes') {
                    Ext.Msg.wait('Now Deleting...', 'Please Wait...');
                    Ext.Ajax.request({
                        url: './src/grp_del.php',
                        params: {
                            grp_id: args.grp_id
                        },
                        success: function(res, eopts) {
                            Ext.Msg.hide();
                            var response = Ext.decode(res.responseText);
                            if (response.success == true) {
                                Ext.Msg.alert('Success', response.msg);
                            } else {
                                sop.common.Utilities.showFailureResponse(response);
                            }
                            Ext.getStore('GrpStore').load();
                        },
                        failure: function(res, eopts) {
                            Ext.Msg.hide();
                            Ext.Msg.alert('Failure', 'An unexpected error has occurred:' + res.statusText); // 予期しないエラーが発生しました:
                        }
                    });
                }
            }
        },

        // --- User 登録 更新
        updUser: function(args) {
            var waitmsg = '';
            if (this.getUserForm().query('#div')[0].value == 'add') {
                Ext.MessageBox.confirm('Confirm', 'Are you sure you want to regist?', submit); // 登録を行います。よろしいですか？
                waitmsg = 'Now Registrating...'; // 登録中です...
            }
            if (this.getUserForm().query('#div')[0].value == 'upd') {
                Ext.MessageBox.confirm('Confirm', 'Are you sure you want to update?', submit); // 更新を行います。よろしいですか？
                waitmsg = 'Now Updating...'; // 更新中です...
            }

            function submit(btn) {
                if (btn == 'yes') {
                    Ext.ComponentQuery.query('#user_form #user_id')[0].enable(); // 値送信のため
                    Ext.ComponentQuery.query('#user_form')[0].getForm().submit({
                        url: './src/user_upd.php',
                        waitMsg: waitmsg,
                        success: function(form, action) {
                            form.owner.up('window').hide();
                            Ext.getStore('UserStore').load();
                            Ext.Msg.alert('Success', action.result.msg);
                        },
                        failure: function(form, action) {
                            if (action.hasOwnProperty('result')) {
                                sop.common.Utilities.showFailureResponse(action.result);
                            } else {
                                Ext.Msg.alert('Failure', action.failureType + ': Please input in required item'); // : 必須項目の入力を行ってください
                            }
                        }
                    });
                }
            }
        },

        // --- password 更新
        updPassword: function(args) {
            var waitmsg = '';
            Ext.MessageBox.confirm('Confirm', 'Are you sure you want to change?', submit); // 変更します。よろしいですか？
            waitmsg = 'Now Changing'; // 変更中です...

            function submit(btn) {
                if (btn == 'yes') {
                    Ext.ComponentQuery.query('#password_form #user_id')[0].enable(); // 値送信のため
                    Ext.ComponentQuery.query('#password_form')[0].getForm().submit({
                        url: './src/pwd_upd.php',
                        waitMsg: waitmsg,
                        success: function(form, action) {
                            form.owner.up('window').hide();
                            Ext.getStore('UserStore').load();
                            Ext.Msg.alert('Success', action.result.msg);
                        },
                        failure: function(form, action) {
                            if (action.hasOwnProperty('result')) {
                                sop.common.Utilities.showFailureResponse(action.result);
                            } else {
                                Ext.Msg.alert('Failure', action.failureType + ': Please input in required item'); // : 必須項目の入力を行ってください
                            }
                        }
                    });
                }
            }
        },

        // --- User 削除
        delUser: function(args) {
            Ext.MessageBox.confirm('Confirm', 'Are you sure you want to delete?', submit); // 削除を行います。よろしいですか？

            function submit(btn) {
                if (btn == 'yes') {
                    Ext.Msg.wait('Now Deleting...', 'Please Wait...'); // 削除中です...
                    Ext.Ajax.request({
                        url: './src/user_del.php',
                        params: {
                            user_id: args.user_id
                        },
                        success: function(res, eopts) {
                            Ext.Msg.hide();
                            var response = Ext.decode(res.responseText);
                            if (response.success == true) {
                                Ext.Msg.alert('Success', response.msg);
                            } else {
                                sop.common.Utilities.showFailureResponse(response);
                            }
                            Ext.getStore('UserStore').load();
                        },
                        failure: function(res, eopts) {
                            Ext.Msg.hide();
                            Ext.Msg.alert('Failure', 'An unexpected error has occurred:' + res.statusText); // 予期しないエラーが発生しました:
                        }
                    });
                }
            }
        }
    }
);
