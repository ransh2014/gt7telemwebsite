"""Submit the site's sitemap to Google Search Console (called by the Deploy site workflow after a deploy).

Needs a Google service account that has been added as an *Owner* of the Search Console property
(Search Console -> Settings -> Users and permissions -> Add user -> the service account's email),
with its JSON key stored in the GSC_SERVICE_ACCOUNT_JSON repository secret.
"""
import json
import os
import sys
import urllib.parse

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

SITE = os.environ.get("GSC_SITE", "https://gt7trace.netlify.app/")
FEED = SITE.rstrip("/") + "/sitemap.xml"

creds = service_account.Credentials.from_service_account_info(
    json.loads(os.environ["GSC_SERVICE_ACCOUNT_JSON"]),
    scopes=["https://www.googleapis.com/auth/webmasters"],
)
url = "https://www.googleapis.com/webmasters/v3/sites/{}/sitemaps/{}".format(
    urllib.parse.quote(SITE, safe=""), urllib.parse.quote(FEED, safe="")
)
resp = AuthorizedSession(creds).put(url)
print(f"Search Console sitemap submit for {FEED}: HTTP {resp.status_code} {resp.text[:300]}")
sys.exit(0 if resp.status_code in (200, 204) else 1)
