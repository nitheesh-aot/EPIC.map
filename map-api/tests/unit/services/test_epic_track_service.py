# Copyright © 2024 Province of British Columbia
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Tests for the EPIC.Track client."""
from unittest.mock import patch

import pytest
import requests

from map_api.exceptions import ServiceUnavailableError
from map_api.services.epic_track_service import PROJECTS_KEY, TrackService
from map_api.utils.cache import cache


TRACK_URL = 'https://track.example'
ISSUER = 'https://sso.example/auth/realms/eao-epic'
TOKEN_URL = f'{ISSUER}/protocol/openid-connect/token'

GET = 'map_api.services.epic_track_service.requests.get'
POST = 'map_api.services.epic_track_service.requests.post'


class _Response:
    def __init__(self, body=None, status_code=200):
        self._body = body
        self.status_code = status_code

    def json(self):
        return self._body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(str(self.status_code))


def _token(access_token='service-token', expires_in=300):
    return _Response({'access_token': access_token, 'expires_in': expires_in})


def _project(project_id, **overrides):
    project = {
        'id': project_id,
        'name': f'Project {project_id}',
        'description': 'A project',
        'latitude': '53.0',
        'longitude': '-122.5',
        'is_project_closed': False,
        'ea_certificate': 'M23-01',
        'type': {'id': 8, 'name': 'Water Management'},
        'proponent': {'id': 1, 'name': 'EVR Operations Limited'},
        'region_env': {'id': 2, 'name': 'Cariboo'},
    }
    project.update(overrides)
    return project


def _work(project_id, work_state):
    return {'id': project_id * 10, 'project_id': project_id, 'work_state': work_state}


def _track(projects, works):
    """Answer Track's two endpoints, in place of requests.get."""
    def get(url, params=None, headers=None, timeout=None):  # pylint: disable=unused-argument
        if url == f'{TRACK_URL}/api/v1/projects':
            return _Response(projects)
        if url == f'{TRACK_URL}/api/v1/works':
            return _Response(works)
        raise AssertionError(f'unexpected url {url}')
    return get


@pytest.fixture(autouse=True)
def _configured(app, monkeypatch):
    monkeypatch.setitem(app.config, 'EPIC_TRACK_API_URL', TRACK_URL)
    monkeypatch.setitem(app.config, 'EPIC_TRACK_CLIENT_ID', 'epic-map-api')
    monkeypatch.setitem(app.config, 'EPIC_TRACK_CLIENT_SECRET', 'secret')
    monkeypatch.setitem(app.config, 'JWT_OIDC_ISSUER', ISSUER)
    with app.app_context():
        cache.clear()
        yield


def test_open_projects_are_returned_with_their_works_in_progress(app):
    """Closed projects are left out; only IN_PROGRESS works make a project green."""
    projects = [
        _project(1),
        _project(2),
        _project(3, is_project_closed=True),
        _project(4),
    ]
    works = [
        _work(1, 'IN_PROGRESS'),
        _work(2, 'COMPLETED'),
        _work(3, 'IN_PROGRESS'),
        _work(4, 'SUSPENDED'),
    ]

    with patch(POST, return_value=_token()), patch(GET, side_effect=_track(projects, works)):
        result = TrackService.open_projects()

    assert [(p['id'], p['has_works_in_progress']) for p in result] == [
        (1, True), (2, False), (4, False)
    ]
    assert result[0] == {
        'id': 1,
        'name': 'Project 1',
        'description': 'A project',
        'longitude': -122.5,
        'latitude': 53.0,
        'type_name': 'Water Management',
        'proponent_name': 'EVR Operations Limited',
        'region_name': 'Cariboo',
        'ea_certificate': 'M23-01',
        'has_works_in_progress': True,
    }


@pytest.mark.parametrize(
    'latitude, longitude',
    [
        (None, '-122.5'),
        ('', '-122.5'),
        ('north', '-122.5'),
        ('95', '-122.5'),
        ('53', '-200'),
        ('0', '0'),
    ],
)
def test_projects_without_a_usable_location_are_left_off(app, latitude, longitude):
    """Track stores coordinates as free text, so anything unreadable is skipped."""
    projects = [_project(1), _project(2, latitude=latitude, longitude=longitude)]

    with patch(POST, return_value=_token()), patch(GET, side_effect=_track(projects, [])):
        result = TrackService.open_projects()

    assert [p['id'] for p in result] == [1]


def test_track_is_asked_with_a_service_account_token(app):
    """Client credentials from this API's own client, sent as a bearer token."""
    with patch(POST, return_value=_token('abc')) as post, \
            patch(GET, side_effect=_track([], [])) as get:
        TrackService.open_projects()

    post.assert_called_once()
    assert post.call_args.args[0] == TOKEN_URL
    assert post.call_args.kwargs['data'] == {
        'grant_type': 'client_credentials',
        'client_id': 'epic-map-api',
        'client_secret': 'secret',
    }
    calls = {call.args[0]: call.kwargs for call in get.call_args_list}
    assert calls[f'{TRACK_URL}/api/v1/projects']['params'] == {'is_active': 'true'}
    assert calls[f'{TRACK_URL}/api/v1/works']['params'] == {
        'is_active': 'true', 'context': 'insights'
    }
    assert all(kwargs['headers'] == {'Authorization': 'Bearer abc'} for kwargs in calls.values())


def test_the_list_is_cached(app):
    """Track is asked once per cache period, however many requests arrive."""
    with patch(POST, return_value=_token()) as post, \
            patch(GET, side_effect=_track([_project(1)], [])) as get:
        TrackService.open_projects()
        TrackService.open_projects()
        TrackService.open_project(1)

    assert get.call_count == 2
    assert post.call_count == 1


def test_the_token_is_reused_until_it_expires(app):
    """A refresh after the list expires does not ask Keycloak again."""
    with patch(POST, return_value=_token()) as post, \
            patch(GET, side_effect=_track([], [])):
        TrackService.open_projects()
        cache.delete(PROJECTS_KEY)
        TrackService.open_projects()

    assert post.call_count == 1


def test_a_refused_token_is_replaced_once(app):
    """Track rejecting the token gets a fresh one rather than an outage."""
    answers = iter([_Response(status_code=401), _Response([_project(1)]), _Response([])])

    with patch(POST, side_effect=[_token('old'), _token('new')]) as post, \
            patch(GET, side_effect=lambda *a, **k: next(answers)) as get:
        result = TrackService.open_projects()

    assert [p['id'] for p in result] == [1]
    assert post.call_count == 2
    assert get.call_args_list[1].kwargs['headers'] == {'Authorization': 'Bearer new'}


@pytest.mark.parametrize(
    'failure',
    [
        {'side_effect': requests.ConnectionError('down')},
        {'return_value': _Response(status_code=500)},
        {'return_value': _Response(status_code=403)},
    ],
)
def test_track_failing_with_nothing_cached_is_unavailable(app, failure):
    """No list to fall back on is a 503, not an empty map."""
    with patch(POST, return_value=_token()), patch(GET, **failure):
        with pytest.raises(ServiceUnavailableError):
            TrackService.open_projects()


def test_track_failing_serves_the_last_list(app):
    """An outage after a good fetch keeps the dots on the map."""
    with patch(POST, return_value=_token()), \
            patch(GET, side_effect=_track([_project(1)], [])):
        TrackService.open_projects()

    cache.delete(PROJECTS_KEY)
    with patch(POST, return_value=_token()), \
            patch(GET, side_effect=requests.ConnectionError('down')):
        result = TrackService.open_projects()

    assert [p['id'] for p in result] == [1]


def test_keycloak_failing_is_unavailable(app):
    """No token, no call to Track."""
    with patch(POST, side_effect=requests.ConnectionError('down')), patch(GET) as get:
        with pytest.raises(ServiceUnavailableError):
            TrackService.open_projects()

    get.assert_not_called()


@pytest.mark.parametrize('missing', ['EPIC_TRACK_API_URL', 'EPIC_TRACK_CLIENT_ID', 'EPIC_TRACK_CLIENT_SECRET'])
def test_an_unconfigured_api_asks_nobody(app, monkeypatch, missing):
    """Missing configuration is a 503 without any outbound call."""
    monkeypatch.setitem(app.config, missing, '')

    with patch(POST) as post, patch(GET) as get:
        with pytest.raises(ServiceUnavailableError):
            TrackService.open_projects()

    post.assert_not_called()
    get.assert_not_called()


def test_open_project_finds_one_or_none(app):
    """Closed or unknown projects have no card."""
    projects = [_project(1), _project(2, is_project_closed=True)]

    with patch(POST, return_value=_token()), patch(GET, side_effect=_track(projects, [])):
        assert TrackService.open_project(1)['id'] == 1
        assert TrackService.open_project(2) is None
        assert TrackService.open_project(99) is None
