import apiClient from './ApiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'vb_cache';
const memoryCache = new Map();
export {
  getOsmEmbedUrl,
  getOsmExternalUrl,
  buildOsmWebViewHtml,
  buildFamilyPointsOsmWebViewHtml,
  buildVolunteerPointsOsmWebViewHtml,
} from '../config/osmMap';

const getApiToken = async () => {
    try {
        return await AsyncStorage.getItem('token') || await AsyncStorage.getItem('X_INIT_TOKEN') || '';
    } catch {
        return '';
    }
};

export const getAssemblyCode = async () => {
    try {
        const explicit = await AsyncStorage.getItem('assemblyCode');
        if (explicit) return explicit;
        const raw = await AsyncStorage.getItem('userInfo');
        if (!raw) return '000000000151';
        const user = JSON.parse(raw);
        return user.assemblyCode || user.assemblyNo || user.assignmentId || '000000000151';
    } catch {
        return '000000000151';
    }
};

function userHasAssignmentScope(user = {}) {
    const role = String(user.role || '').replace('ROLE_', '').toUpperCase();
    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) return true;
    if (Array.isArray(user.wardIds) && user.wardIds.length > 0) return true;
    if (Array.isArray(user.boothIds) && user.boothIds.length > 0) return true;
    if (Array.isArray(user.assemblyIds) && user.assemblyIds.length > 0) return true;
    if (user.wardId != null && String(user.wardId).trim() !== '') return true;
    if (user.boothId != null && String(user.boothId).trim() !== '') return true;
    if (user.assignmentId != null && String(user.assignmentId).trim() !== '') return true;
    return false;
}

let profileBootstrapPromise = null;

export async function ensureUserProfileReady() {
    try {
        const raw = await AsyncStorage.getItem('userInfo');
        const cached = raw ? JSON.parse(raw) : {};
        if (!cached?.token) return cached;
        if (userHasAssignmentScope(cached)) return cached;
        if (!profileBootstrapPromise) {
            profileBootstrapPromise = apiClient.get('/votebase/v1/api/me')
                .then((res) => {
                    const updated = res?.data?.data?.result || res?.data?.result || res?.data || res;
                    if (updated && typeof updated === 'object') {
                        const merged = { ...cached, ...updated };
                        AsyncStorage.setItem('userInfo', JSON.stringify(merged));
                        return merged;
                    }
                    return cached;
                })
                .catch(() => cached)
                .finally(() => {
                    profileBootstrapPromise = null;
                });
        }
        return profileBootstrapPromise;
    } catch {
        return {};
    }
}

export function parseVoterSearchResponse(payload) {
    const data = payload?.data ?? payload ?? {};
    const results = Array.isArray(data?.result)
        ? data.result
        : (Array.isArray(data) ? data : (Array.isArray(payload?.result) ? payload.result : []));
    const meta = data?.meta ?? payload?.meta ?? {};
    return { results, meta };
}

const getCached = async (suffix) => {
    const userId = 'user'; // Simplified for mobile cache
    const key = `${CACHE_PREFIX}_${userId}_${suffix}`;
    if (memoryCache.has(key)) return memoryCache.get(key);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        memoryCache.set(key, parsed);
        return parsed;
    } catch {
        return null;
    }
};

const setCached = async (suffix, value) => {
    const userId = 'user';
    const key = `${CACHE_PREFIX}_${userId}_${suffix}`;
    memoryCache.set(key, value);
    await AsyncStorage.setItem(key, JSON.stringify(value));
};

const PUBLIC_VOTER_UPDATE_FIELDS = new Set([
    'mobile', 'dob', 'community', 'caste', 'motherTongue', 'education',
    'residenceType', 'ownership', 'voterPoints', 'govtSchemeTracking',
    'engagementPotential', 'ifShifted', 'status', 'civicIssue', 'natureOfVoter',
    'notes', 'presentAddress', 'newWard', 'newBoothNo', 'newSerialNo',
    'notAvailableReason', 'latitude', 'longitude', 'gender', 'age',
    'houseNoEn', 'houseNoLocal', 'firstMiddleNameEn', 'lastNameEn',
    'firstMiddleNameLocal', 'lastNameLocal', 'addressEn', 'addressLocal',
    'relationFirstMiddleNameEn', 'relationLastNameEn', 'relationFirstMiddleNameLocal',
    'relationLastNameLocal', 'relationType', 'team',
]);

const buildPublicVoterUpdatePayload = (jsonReq = {}, options = {}) => {
    const updateRequest = Object.entries(jsonReq?.updateRequest || {}).reduce((acc, [key, value]) => {
        if (PUBLIC_VOTER_UPDATE_FIELDS.has(key)) acc[key] = value;
        return acc;
    }, {});

    return {
        wardCode: options.wardCode || undefined,
        boothNo: options.boothNo != null ? String(options.boothNo) : undefined,
        updateRequest,
    };
};

export const CRUDAPI = {
    fetchMe: async () => {
        const response = await apiClient.get('/votebase/v1/api/me');
        return response.data;
    },

    getAssemblyDropdown: async () => {
        try {
            const response = await apiClient.get('/votebase/v1/api/volunteers/dropdown?level=ASSEMBLY');
            return response.data;
        } catch (error) {
            console.log('Get Assembly Dropdown API Error:', error.response?.data || error.message);
            throw error;
        }
    },
    
    loginApi: async (data) => {
        try {
            const response = await apiClient.post('/votebase/v1/api/auth/login', data);
            return response?.data;
        } catch (error) {
            return error.response?.data || error.message;
        }
    },

    loadData: async (assemblyCode) => {
        try {
            const asm = assemblyCode || await getAssemblyCode();
            const response = await apiClient.get(`/votebase/v1/api/voters/snapshot?assemblyCode=${asm}`);
            return response.data;
        } catch (error) {
            console.log('Load data API Error:', error.response?.data || error.message);
            throw error;
        }
    },

    loadDataLite: async (assemblyCode) => {
        try {
            const asm = assemblyCode || await getAssemblyCode();
            const response = await apiClient.get(`/votebase/v1/api/voters/snapshot?assemblyCode=${asm}&includeVoters=false`);
            return response.data;
        } catch (error) {
            console.log('Load lite data API Error:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchBoothVoters: async (boothId) => {
        try {
            const response = await apiClient.get(`/votebase/v1/api/voters/by-booth?boothId=${boothId}`);
            return response.data;
        } catch (error) {
            console.log('Fetch booth voters API Error:', error.response?.data || error.message);
            throw error;
        }
    },

    searchVoters: async (params = {}) => {
        try {
            const query = {
                assemblyCode: params.assemblyCode || await getAssemblyCode(),
                page: params.page ?? 0,
                size: params.size ?? 500,
            };

            if (params.searchQuery?.trim()) query.searchQuery = params.searchQuery.trim();
            if (params.wardId !== undefined && params.wardId !== null && String(params.wardId).trim() !== '') {
                query.wardId = Number(params.wardId);
            }
            if (params.boothNumber?.trim()) query.boothNumber = params.boothNumber.trim();
            if (params.mobileNumber?.trim()) query.mobileNumber = params.mobileNumber.trim();
            if (params.epicId?.trim()) query.epicId = params.epicId.trim();
            if (params.relationName?.trim()) query.relationName = params.relationName.trim();
            if (params.houseNumber?.trim()) query.houseNumber = params.houseNumber.trim();

            const response = await apiClient.get('/votebase/v1/api/voter-search', { params: query });
            return response.data;
        } catch (error) {
            console.log('Search voters API Error:', error.response?.data || error.message);
            throw error;
        }
    },

    updateVoter: async (epicNo, jsonReq, options = {}) => {
        try {
            const payload = buildPublicVoterUpdatePayload(jsonReq, options);
            const response = await apiClient.put(`/votebase/v1/api/voters/by-epic/${encodeURIComponent(epicNo)}`, payload);
            return response.data;
        } catch (error) {
            console.log('Update Voter API Error:', error.response?.data || error.message);
            throw error.response?.data ;
        }
    },

    getUserProfile: async () => {
        try {
            const response = await apiClient.get('/votebase/v1/api/user/profile');
            return response.data;
        } catch (error) {
            console.log('Error while fetching user profile data:', error.response?.data || error.message)
            throw error;
        }
    },

    updateUserProfile: async (jsonReq) => {
        try {
            const response = await apiClient.put('/votebase/v1/api/user/profile', jsonReq);
            return response.data;
        } catch (error) {
            console.log('Error while updating profile info:', error.response?.data || error.message)
        }
    },

    getVolunteerList: async (role, page, size, search, blocked, sortBy, direction, assignmentType, deleted, assemblyId) => {
        try {
            const params = {
                page: page ?? 0,
                size: size ?? 10,
                search: search || '',
                blocked: blocked || '',
                sortBy: sortBy || '',
                direction: direction || '',
                workingLevel: assignmentType || '',
                deleted: deleted ?? '',
                assemblyCode: assemblyId || ''
            };
            const response = await apiClient.get('/votebase/v1/api/volunteers', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching volunteer data:', error.response?.data || error.message)
            throw error;
        }
    },

    addVolunteer: async (data) => {
        try {
            const response = await apiClient.post('/votebase/v1/api/volunteers', data);
            return response?.data;
        } catch (error) {
            console.log('Error while adding volunteer:', error.response?.data || error.message);
            throw error;
        }
    },

    updateVolunteer: async (data) => {
        try {
            const response = await apiClient.put('/votebase/v1/api/volunteers', data);
            return response.data;
        } catch (error) {
            console.log('Error while updating volunteer:', error.response?.data || error.message);
            throw error;
        }
    },

    blockVolunteer: async (jsonReq) => {
        try {
            const response = await apiClient.put('/votebase/v1/api/user/block', jsonReq);
            return response.data;
        } catch (error) {
            console.log('Error while blocking volunteer:', error.response?.data || error.message);
            throw error;
        }
    },

    removeVolunteer: async (jsonReq) => {
        try {
            const response = await apiClient.put('/votebase/v1/api/user/delete', jsonReq);
            return response.data;
        } catch (error) {
            console.log('Error while deleting volunteer:', error.response?.data || error.message);
            throw error;
        }
    },

    bulkRemoveVolunteer: async (jsonReq) => {
        try {
            const response = await apiClient.put('/votebase/v1/api/user/delete/bulk', jsonReq);
            return response.data;
        } catch (error) {
            console.log('Error while bulk deleting volunteers:', error.response?.data || error.message);
            throw error;
        }
    },

    bulkBlockVolunteer: async (jsonReq) => {
        try {
            const response = await apiClient.put('/votebase/v1/api/user/block/bulk', jsonReq);
            return response.data;
        } catch (error) {
            console.log('Error while bulk blocking volunteers:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchVolunteerDropdown: async (level, parentId) => {
        try {
            const params = { level };
            if (parentId) params.parentId = parentId;
            const response = await apiClient.get('/votebase/v1/api/volunteers/dropdown', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching volunteer dropdown:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchWards: async (assemblyId) => {
        try {
            const params = assemblyId ? { assemblyId } : {};
            const response = await apiClient.get('/votebase/v1/api/wards', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching wards:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchBooths: async (assemblyCode, wardId) => {
        try {
            const params = {};
            if (assemblyCode) params.assemblyCode = assemblyCode;
            if (wardId) params.wardId = wardId;
            const response = await apiClient.get('/votebase/v1/api/booths', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching booths:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchVolunteerAnalysis: async (wardId, mode, assemblyCode) => {
        try {
            const params = {};
            if (wardId) params.wardId = wardId;
            if (mode) params.mode = mode;
            if (assemblyCode) params.assemblyCode = assemblyCode;
            const response = await apiClient.get('/votebase/v1/api/volunteers/analysis', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching volunteer analysis:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchVolunteerEnrichmentDetails: async (wardId, updatedFrom, updatedTo, page, size, assemblyCode) => {
        try {
            const params = { wardId, updatedFrom, updatedTo, page, size };
            if (assemblyCode) params.assemblyCode = assemblyCode;
            const response = await apiClient.get('/votebase/v1/api/volunteers/analysis/enrichment', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching volunteer enrichment details:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchVolunteerLocationPoints: async (wardId, assemblyCode) => {
        try {
            const params = {};
            if (wardId) params.wardId = wardId;
            if (assemblyCode) params.assemblyCode = assemblyCode;
            const response = await apiClient.get('/votebase/v1/api/volunteers/analysis/locations', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching volunteer map locations:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchFamilyAnalysis: async (wardId, mode, assemblyCode) => {
        try {
            const params = {};
            if (wardId) params.wardId = wardId;
            if (mode) params.mode = mode;
            if (assemblyCode && !wardId) params.assemblyCode = assemblyCode;
            const response = await apiClient.get('/votebase/v1/api/families/analysis', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching family analysis:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchFamilyLocationPoints: async (wardId, assemblyCode, boothId) => {
        const filterPoints = (rows, { trustServerWardScope = false } = {}) =>
            (Array.isArray(rows) ? rows : []).filter((item) => {
                const lat = Number(item?.latitude);
                const lng = Number(item?.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return false;
                if (trustServerWardScope) return true;
                const wardIdStr = wardId ? String(wardId) : '';
                if (!wardIdStr) return true;
                const itemWardId = String(item?.wardId ?? item?.ward_id ?? '').trim();
                const itemWardCode = String(item?.wardCode ?? item?.ward_code ?? '').trim();
                if (itemWardId === wardIdStr) return true;
                return false;
            });
        try {
            const params = {};
            if (wardId) params.wardId = wardId;
            if (boothId) params.boothId = boothId;
            if (assemblyCode && !wardId) params.assemblyCode = assemblyCode;
            const response = await apiClient.get('/votebase/v1/api/families/map-points', { params });
            const payload = response?.data?.result ?? response?.data ?? [];
            return {
                data: {
                    result: filterPoints(payload, { trustServerWardScope: Boolean(wardId || boothId) }),
                },
            };
        } catch (apiErr) {
            console.warn('Family map-points fallback to family list.', apiErr?.response?.data || apiErr?.message);
            try {
                const rows = await CRUDAPI.fetchAllFamilies(undefined, boothId, wardId, assemblyCode);
                return {
                    data: {
                        result: filterPoints(rows, { trustServerWardScope: Boolean(wardId || boothId) }),
                    },
                };
            } catch (error) {
                console.log('Error while fetching family map locations:', error.response?.data || error.message);
                throw error;
            }
        }
    },

    fetchFamilyDetails: async (wardId, boothId, updatedFrom, updatedTo, page, size, assemblyCode) => {
        try {
            const params = {};
            if (wardId) params.wardId = wardId;
            if (boothId) params.boothId = boothId;
            if (assemblyCode && !wardId) params.assemblyCode = assemblyCode;
            if (updatedFrom) params.updatedFrom = updatedFrom;
            if (updatedTo) params.updatedTo = updatedTo;
            if (page !== undefined) params.page = page;
            if (size !== undefined) params.size = size;
            const response = await apiClient.get('/votebase/v1/api/families/details', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching family details:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchMessageTemplate: async (wardId, channel, epicNo = null) => {
        try {
            const params = { channel };
            if (wardId) params.wardId = wardId;
            if (epicNo) params.epicNo = epicNo;
            const response = await apiClient.get('/votebase/v1/api/message-template', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching message template:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchActivatedWards: async (assemblyId) => {
        try {
            const query = assemblyId ? `?assemblyId=${encodeURIComponent(assemblyId)}` : '';
            const response = await apiClient.get(`/votebase/v1/api/message-template/activated-wards${query}`);
            return response.data;
        } catch (error) {
            console.log('Error while fetching activated wards:', error.response?.data || error.message);
            throw error;
        }
    },

    saveMessageTemplate: async (payload) => {
        try {
            const response = await apiClient.put('/votebase/v1/api/message-template', payload);
            return response.data;
        } catch (error) {
            console.log('Error while saving message template:', error.response?.data || error.message);
            throw error;
        }
    },

    deactivateAllTemplates: async (channel) => {
        try {
            const response = await apiClient.post(`/votebase/v1/api/message-template/deactivate-all?channel=${encodeURIComponent(channel)}`);
            return response.data;
        } catch (error) {
            console.log('Error while deactivating templates:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchPollDayConfig: async (assemblyId, wardId) => {
        try {
            const params = {};
            if (assemblyId) params.assemblyId = assemblyId;
            if (wardId) params.wardId = wardId;
            const response = await apiClient.get('/votebase/v1/api/poll-day/config', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching poll day config:', error.response?.data || error.message);
            throw error;
        }
    },

    updatePollDayConfig: async (assemblyId, wardId, enabled) => {
        try {
            const response = await apiClient.post('/votebase/v1/api/poll-day/config', { assemblyId, wardId, enabled });
            return response.data;
        } catch (error) {
            console.log('Error while updating poll day config:', error.response?.data || error.message);
            throw error;
        }
    },

    updateVoterStatus: async (epic, status, wardCode, boothNo) => {
        try {
            const response = await apiClient.put(`/votebase/v1/api/voters/by-epic/${encodeURIComponent(epic)}`, {
                wardCode,
                boothNo,
                updateRequest: { status }
            });
            return response.data;
        } catch (error) {
            console.log('Error while updating voter status:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchFamilies: async (hasAssociation, page, size, boothId, wardId, assemblyCode) => {
        try {
            const params = { page, size };
            if (boothId) params.boothId = boothId;
            if (wardId !== undefined && wardId !== null && String(wardId).trim() !== '') {
                params.wardId = Number(wardId);
            }
            if (assemblyCode !== undefined && assemblyCode !== null && String(assemblyCode).trim() !== '') {
                params.assemblyCode = String(assemblyCode);
            }
            if (hasAssociation) params.association = hasAssociation;
            const response = await apiClient.get('/votebase/v1/api/family', { params });
            return response.data;
        } catch (error) {
            console.log('Error while fetching families:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchFamilySuggestions: async (type) => {
        try {
            const response = await apiClient.get(`/votebase/v1/api/family/suggestions?type=${encodeURIComponent(type)}`);
            return response.data;
        } catch (error) {
            console.log('Error while fetching family suggestions:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchAllFamilies: async (hasAssociation, boothId, wardId, assemblyCode) => {
        const size = 200;
        let page = 0;
        let all = [];
        while (page < 100) {
            const res = await CRUDAPI.fetchFamilies(hasAssociation, page, size, boothId, wardId, assemblyCode);
            const chunk = res?.content || res?.data?.content || res?.data?.result || res?.result || res?.data || [];
            const list = Array.isArray(chunk) ? chunk : [];
            all = all.concat(list);
            if (list.length < size) break;
            page += 1;
        }
        return all;
    },

    createFamily: async (jsonReq) => {
        try {
            const response = await apiClient.post('/votebase/v1/api/family', jsonReq);
            return response.data;
        } catch (error) {
            console.log('Error while creating family:', error.response?.data || error.message);
            throw error;
        }
    },

    updateFamily: async (id, jsonReq) => {
        try {
            const response = await apiClient.put(`/votebase/v1/api/family/${id}`, jsonReq);
            return response.data;
        } catch (error) {
            console.log('Error while updating family:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchMeetings: async () => {
        try {
            const response = await apiClient.get('/votebase/v1/api/meetings');
            return response.data;
        } catch (error) {
            console.log('Error while fetching meetings:', error.response?.data || error.message);
            throw error;
        }
    },

    createMeeting: async (jsonReq) => {
        try {
            const response = await apiClient.post('/votebase/v1/api/meetings', jsonReq);
            return response.data;
        } catch (error) {
            console.log('Error while creating meeting:', error.response?.data || error.message);
            throw error;
        }
    },

    recordMeetingAttendance: async (id) => {
        try {
            const response = await apiClient.post(`/votebase/v1/api/meetings/${id}/attendance`);
            return response.data;
        } catch (error) {
            console.log('Error while recording meeting attendance:', error.response?.data || error.message);
            throw error;
        }
    },

    attendMeetingSelf: async (id, lat, lng) => {
        try {
            let url = `/votebase/v1/api/meetings/${id}/attend-self`;
            if (lat !== null && lng !== null && lat !== undefined && lng !== undefined) {
                url += `?lat=${lat}&lng=${lng}`;
            }
            const response = await apiClient.post(url);
            return response.data;
        } catch (error) {
            console.log('Error while recording self attendance:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchMeetingAttendance: async (id) => {
        try {
            const response = await apiClient.get(`/votebase/v1/api/meetings/${encodeURIComponent(id)}/attendance`);
            return response.data;
        } catch (error) {
            console.log('Error while fetching meeting attendance:', error.response?.data || error.message);
            throw error;
        }
    }
};
