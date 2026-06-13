(function () {
  var urlMeta = document.querySelector('meta[name="cofex-supabase-url"]');
  var keyMeta = document.querySelector('meta[name="cofex-supabase-key"]');
  if (!urlMeta || !keyMeta) return;

  var base = urlMeta.getAttribute('content');
  var key = keyMeta.getAttribute('content');
  if (!base || !key) return;

  var ref = new URL(base).hostname.split('.')[0];
  var storageKey = 'sb-' + ref + '-auth-token';
  var verifierKey = storageKey + '-code-verifier';

  function b64Url(bytes) {
    var str = typeof bytes === 'string' ? bytes : String.fromCharCode.apply(null, new Uint8Array(bytes));
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function randomVerifier() {
    var buf = new Uint8Array(32);
    crypto.getRandomValues(buf);
    return b64Url(buf);
  }

  function sha256(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(b64Url);
  }

  function afterLoginPath() {
    var page = document.querySelector('[data-cofex-auth-page]');
    var pageNext = page && page.getAttribute('data-cofex-auth-next');
    var qNext = new URLSearchParams(location.search).get('next');
    var path = pageNext || (qNext && qNext.charAt(0) === '/' ? qNext : null);
    return path || '/explore';
  }

  function goAfterLogin() {
    location.assign(afterLoginPath());
  }

  function persistSession(data) {
    var session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      token_type: data.token_type || 'bearer',
      user: data.user,
    };
    localStorage.setItem(storageKey, JSON.stringify(session));
  }

  function apiHeaders() {
    return {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: 'Bearer ' + key,
    };
  }

  function clearAuthUrl() {
    var params = new URLSearchParams(location.search);
    params.delete('code');
    params.delete('error');
    params.delete('error_description');
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  function showAuthMsg(el, text) {
    if (!el) return;
    if (text) {
      el.textContent = text;
      el.classList.remove('hidden');
    } else {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  function setAuthMode(form, mode) {
    form.setAttribute('data-cofex-auth-mode', mode);
    var title = document.querySelector('[data-cofex-auth-title]');
    var subtitle = document.querySelector('[data-cofex-auth-subtitle]');
    var nameField = document.querySelector('[data-cofex-auth-name-field]');
    var forgot = document.querySelector('[data-cofex-auth-forgot]');
    var submit = document.querySelector('[data-cofex-auth-submit]');
    var toggle = document.querySelector('[data-cofex-auth-toggle]');
    var nameInput = nameField && nameField.querySelector('input');
    if (title) title.textContent = mode === 'signin' ? 'Welcome back' : 'Join the network';
    if (subtitle)
      subtitle.textContent = mode === 'signin' ? 'Sign in to keep exploring.' : 'Snap, share, earn coffees.';
    if (nameField) nameField.classList.toggle('hidden', mode === 'signin');
    if (nameInput) nameInput.required = mode === 'signup';
    if (forgot) forgot.classList.toggle('hidden', mode === 'signup');
    if (submit) submit.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
    if (toggle)
      toggle.textContent =
        mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in';
  }

  function handleOAuthCallback() {
    var params = new URLSearchParams(location.search);
    var errEl = document.querySelector('[data-cofex-auth-error]');

    if (params.get('error')) {
      showAuthMsg(errEl, params.get('error_description') || params.get('error') || 'Sign in failed');
      clearAuthUrl();
      return;
    }

    var hash = location.hash && location.hash.charAt(0) === '#' ? location.hash.slice(1) : '';
    if (hash && hash.indexOf('access_token=') >= 0) {
      var hashParams = new URLSearchParams(hash);
      var access = hashParams.get('access_token');
      var refresh = hashParams.get('refresh_token');
      if (access) {
        persistSession({
          access_token: access,
          refresh_token: refresh || '',
          expires_in: Number(hashParams.get('expires_in') || 3600),
          token_type: hashParams.get('token_type') || 'bearer',
          user: null,
        });
        history.replaceState(null, '', location.pathname + location.search);
        goAfterLogin();
        return;
      }
    }

    var code = params.get('code');
    if (!code) return;

    document.documentElement.setAttribute('data-cofex-auth-busy', 'true');

    var verifier = localStorage.getItem(verifierKey);
    if (!verifier) {
      showAuthMsg(errEl, 'Sign-in session expired. Please try Google sign-in again.');
      clearAuthUrl();
      return;
    }

    document.documentElement.setAttribute('data-cofex-auth-busy', 'true');

    fetch(base + '/auth/v1/token?grant_type=pkce', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        localStorage.removeItem(verifierKey);
        clearAuthUrl();
        document.documentElement.removeAttribute('data-cofex-auth-busy');
        if (!r.ok || !r.data.access_token) {
          showAuthMsg(errEl, (r.data && (r.data.error_description || r.data.msg)) || 'Could not complete sign-in.');
          return;
        }
        persistSession(r.data);
        goAfterLogin();
      })
      .catch(function () {
        localStorage.removeItem(verifierKey);
        clearAuthUrl();
        document.documentElement.removeAttribute('data-cofex-auth-busy');
        showAuthMsg(errEl, 'Network error while completing sign-in.');
      });
  }

  function startOAuth(provider, btn) {
    var qNext = new URLSearchParams(location.search).get('next');
    var page = document.querySelector('[data-cofex-auth-page]');
    var pageNext = page && page.getAttribute('data-cofex-auth-next');
    var nextPath = pageNext || (qNext && qNext.charAt(0) === '/' ? qNext : '');
    var redirectTo = location.origin + '/auth' + (nextPath ? '?next=' + encodeURIComponent(nextPath) : '');

    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');

    var verifier = randomVerifier();
    localStorage.setItem(verifierKey, verifier);

    sha256(verifier).then(function (challenge) {
      var url =
        base +
        '/auth/v1/authorize?provider=' +
        encodeURIComponent(provider) +
        '&redirect_to=' +
        encodeURIComponent(redirectTo) +
        '&code_challenge=' +
        encodeURIComponent(challenge) +
        '&code_challenge_method=s256';
      location.assign(url);
    });
  }

  handleOAuthCallback();

  try {
    var existing = localStorage.getItem(storageKey);
    if (existing && document.querySelector('[data-cofex-auth-page]')) {
      var parsed = JSON.parse(existing);
      if (parsed.expires_at > Math.floor(Date.now() / 1000) && !new URLSearchParams(location.search).has('code')) {
        goAfterLogin();
      }
    }
  } catch (e) {}

  document.addEventListener(
    'click',
    function (e) {
      var oauth = e.target.closest('[data-cofex-oauth]');
      if (oauth && !oauth.disabled) {
        e.preventDefault();
        e.stopPropagation();
        startOAuth(oauth.getAttribute('data-cofex-oauth'), oauth);
        return;
      }

      var toggle = e.target.closest('[data-cofex-auth-toggle]');
      if (toggle) {
        e.preventDefault();
        var form = document.querySelector('[data-cofex-auth-form]');
        if (!form) return;
        var mode = form.getAttribute('data-cofex-auth-mode') === 'signup' ? 'signin' : 'signup';
        setAuthMode(form, mode);
        showAuthMsg(document.querySelector('[data-cofex-auth-error]'), '');
        showAuthMsg(document.querySelector('[data-cofex-auth-info]'), '');
      }
    },
    true,
  );

  document.addEventListener(
    'submit',
    function (e) {
      var form = e.target.closest('[data-cofex-auth-form]');
      if (!form) return;
      e.preventDefault();
      e.stopImmediatePropagation();

      var mode = form.getAttribute('data-cofex-auth-mode') || 'signin';
      var email = form.querySelector('[name="email"]').value.trim();
      var password = form.querySelector('[name="password"]').value;
      var nameInput = form.querySelector('[name="name"]');
      var name = nameInput ? nameInput.value.trim() : '';
      var errEl = document.querySelector('[data-cofex-auth-error]');
      var infoEl = document.querySelector('[data-cofex-auth-info]');
      var submit = document.querySelector('[data-cofex-auth-submit]');

      showAuthMsg(errEl, '');
      showAuthMsg(infoEl, '');
      if (submit) {
        submit.disabled = true;
        submit.textContent = '…';
      }

      var endpoint = mode === 'signup' ? base + '/auth/v1/signup' : base + '/auth/v1/token?grant_type=password';
      var body =
        mode === 'signup'
          ? { email: email, password: password, data: { full_name: name } }
          : { email: email, password: password };

      fetch(endpoint, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (r) {
          if (submit) {
            submit.disabled = false;
            submit.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
          }
          if (!r.ok) {
            var msg = (r.data && r.data.error_description) || (r.data && r.data.msg) || 'Sign in failed';
            if (msg.toLowerCase().indexOf('invalid') >= 0) msg = 'Email or password is incorrect.';
            showAuthMsg(errEl, msg);
            return;
          }
          if (r.data.access_token && r.data.user) {
            persistSession(r.data);
            goAfterLogin();
            return;
          }
          if (mode === 'signup' && r.data.user) {
            showAuthMsg(infoEl, 'Check your email to confirm your account, then sign in.');
            setAuthMode(form, 'signin');
            return;
          }
          showAuthMsg(errEl, 'Something went wrong. Please try again.');
        })
        .catch(function () {
          if (submit) {
            submit.disabled = false;
            submit.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
          }
          showAuthMsg(errEl, 'Network error. Please try again.');
        });
    },
    true,
  );
})();
