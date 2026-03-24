import apiClient from './ApiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'vb_cache';
const CACHE_USER_KEY = `${CACHE_PREFIX}_user`;
const memoryCache = new Map();

const getUserCacheId = async () => {
    try {
        const raw = await AsyncStorage.getItem('userInfo');
        if (!raw) return 'anonymous';
        const user = JSON.parse(raw);
        return (
            user?.userName ||
            user?.firstName ||
            user?.phone ||
            user?.tenantId ||
            'anonymous'
        );
    } catch {
        return 'anonymous';
    }
};

const clearAllCaches = async () => {
    memoryCache.clear();
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
};

const ensureCacheUser = async () => {
    const currentUser = await getUserCacheId();
    const lastUser = await AsyncStorage.getItem(CACHE_USER_KEY);
    if (lastUser && lastUser !== currentUser) {
        await clearAllCaches();
    }
    await AsyncStorage.setItem(CACHE_USER_KEY, currentUser);
    return currentUser;
};

const cacheKey = (userId, suffix) => `${CACHE_PREFIX}_${userId}_${suffix}`;

const getCached = async (suffix) => {
    const userId = await ensureCacheUser();
    const key = cacheKey(userId, suffix);
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
    const userId = await ensureCacheUser();
    const key = cacheKey(userId, suffix);
    memoryCache.set(key, value);
    await AsyncStorage.setItem(key, JSON.stringify(value));
};

const PUBLIC_VOTER_UPDATE_FIELDS = new Set([
    'mobile',
    'dob',
    'community',
    'caste',
    'motherTongue',
    'education',
    'residenceType',
    'ownership',
    'voterPoints',
    'govtSchemeTracking',
    'engagementPotential',
    'ifShifted',
    'status',
    'civicIssue',
    'natureOfVoter',
    'notes',
    'presentAddress',
    'newWard',
    'newBoothNo',
    'newSerialNo',
    'notAvailableReason',
    'latitude',
    'longitude',
    'gender',
    'age',
    'houseNoEn',
    'houseNoLocal',
    'firstMiddleNameEn',
    'lastNameEn',
    'firstMiddleNameLocal',
    'lastNameLocal',
    'addressEn',
    'addressLocal',
    'relationFirstMiddleNameEn',
    'relationLastNameEn',
    'relationFirstMiddleNameLocal',
    'relationLastNameLocal',
    'relationType',
    'team',
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
    loginApi: async (data) => {
        try {
            const response = await apiClient.post('/votebase/v1/api/auth/login', data);
            return response?.data;
        } catch (error) {
            return error.response?.data || error.message;
        }
    },

    loadData: async () => {
        try {
            const cached = await getCached('snapshot_full');
            if (cached) return cached;
            const response = await apiClient.get('/votebase/v1/api/voters/snapshot?assemblyCode=000000000175');
            const data = response.data;
            await setCached('snapshot_full', data);
            return data;
        } catch (error) {
            console.log('Load data API Error:', error.response?.data || error.message);
            throw error;
        }
    },

    loadDataLite: async () => {
        try {
            const cached = await getCached('snapshot_lite');
            if (cached) return cached;
            const response = await apiClient.get('/votebase/v1/api/voters/snapshot?assemblyCode=000000000175&includeVoters=false');
            const data = response.data;
            await setCached('snapshot_lite', data);
            return data;
        } catch (error) {
            console.log('Load lite data API Error:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchBoothVoters: async (boothId) => {
        try {
            const suffix = `booth_voters_${boothId}`;
            const cached = await getCached(suffix);
            if (cached) return cached;
            const response = await apiClient.get(`/votebase/v1/api/voters/by-booth?boothId=${boothId}`);
            const data = response.data;
            await setCached(suffix, data);
            return data;
        } catch (error) {
            console.log('Fetch booth voters API Error:', error.response?.data || error.message);
            throw error;
        }
    },

    searchVoters: async (params = {}) => {
        try {
            const query = {
                assemblyCode: params.assemblyCode || '000000000175',
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

            const cacheSuffix = `voter_search_${Object.keys(query)
                .sort()
                .map((k) => `${k}=${String(query[k])}`)
                .join("&")}`;
            const cached = await getCached(cacheSuffix);
            if (cached) return cached;
            const response = await apiClient.get('/votebase/v1/api/voter-search', { params: query });
            const data = response.data;
            await setCached(cacheSuffix, data);
            return data;
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
            console.log('Error while fetching user profile data:', error.response.data || error.message)
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

    uploadUserProfilePic: async (formData) => {
        try {
            const response = await apiClient.post('/votebase/v1/api/user/profile/upload', formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            return response.data;
        } catch (error) {
            console.log('Error while uploading profile info:', error.response?.data || error.message)
        }
    },

    getVolunteerList: async (page, size, search, blocked, sortBy, direction, workingLevel) => {
        try {
            const params = new URLSearchParams();
            params.set('page', String(page ?? 0));
            params.set('size', String(size ?? 10));
            if (search) params.set('search', String(search));
            if (blocked !== undefined && blocked !== null && String(blocked) !== '') params.set('blocked', String(blocked));
            if (sortBy) params.set('sortBy', String(sortBy));
            if (direction) params.set('direction', String(direction));
            if (workingLevel) params.set('workingLevel', String(workingLevel));
            const response = await apiClient.get(`/votebase/v1/api/volunteers?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.log('Error while fetching volunteer data:', error.response.data || error.message)
            throw error;
        }
    },

    addVolunteer: async (data) => {
        try {
            const response = await apiClient.post('/votebase/v1/api/volunteers', data);
            return response?.data;
        } catch (error) {
            console.log('Error while adding volunteer:', error.response?.data || error.message);
            return error.response?.data || error.message;
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
            // fixed: add leading slash to endpoint
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
            console.log('Error while updating bulk remove volunteer:', error.response?.data || error.message);
            throw error;
        }
    },

    bulkBlockVolunteer: async (jsonReq) => {
        try {
            const response = await apiClient.put('/votebase/v1/api/user/block/bulk', jsonReq);
            return response.data;
        } catch (error) {
            console.log('Error while blocking bulk volunteers:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchBoothIds: async () => {
        try {
            const cached = await getCached('booth_ids');
            if (cached) return cached;
            const response = await apiClient.get('/votebase/v1/api/booth');
            const data = response.data;
            await setCached('booth_ids', data);
            return data;
        } catch (error) {
            console.log('Error while fetching booth ids:', error.response?.data || error.message);
            throw error;
        }
    },
    fetchAssignments: async (type) => {
        try {
            const response = await apiClient.get(`/votebase/v1/api/assignments?type=${encodeURIComponent(type)}`);
            return response.data;
        } catch (error) {
            console.log('Error while fetching assignments:', error.response?.data || error.message);
            throw error;
        }
    },
    fetchVolunteerDropdown: async (level, parentId) => {
        try {
            const suffix = `volunteer_dropdown_${level || 'ALL'}_${parentId || 'root'}`;
            const cached = await getCached(suffix);
            if (cached) return cached;
            const query = parentId ? `?level=${encodeURIComponent(level)}&parentId=${encodeURIComponent(parentId)}` : `?level=${encodeURIComponent(level)}`;
            const response = await apiClient.get(`/votebase/v1/api/volunteers/dropdown${query}`);
            const data = response.data;
            await setCached(suffix, data);
            return data;
        } catch (error) {
            console.log('Error while fetching volunteer dropdown:', error.response?.data || error.message);
            throw error;
        }
    },
    fetchWards: async (assemblyId) => {
        try {
            const suffix = `wards_${assemblyId || 'all'}`;
            const cached = await getCached(suffix);
            if (cached) return cached;
            const query = assemblyId ? `?assemblyId=${encodeURIComponent(assemblyId)}` : '';
            const response = await apiClient.get(`/votebase/v1/api/wards${query}`);
            const data = response.data;
            await setCached(suffix, data);
            return data;
        } catch (error) {
            console.log('Error while fetching wards:', error.response?.data || error.message);
            throw error;
        }
    },
    fetchBooths: async (assemblyCode, wardId) => {
        try {
            const suffix = `booths_${assemblyCode || 'all'}_${wardId || 'all'}`;
            const cached = await getCached(suffix);
            if (cached) return cached;
            const params = new URLSearchParams();
            if (assemblyCode) params.set('assemblyCode', String(assemblyCode));
            if (wardId) params.set('wardId', String(wardId));
            const qs = params.toString();
            const response = await apiClient.get(`/votebase/v1/api/booths${qs ? `?${qs}` : ''}`);
            const data = response.data;
            await setCached(suffix, data);
            return data;
        } catch (error) {
            console.log('Error while fetching booths:', error.response?.data || error.message);
            throw error;
        }
    },
    ping: async () => {
        try {
            const response = await apiClient.get('/votebase/v1/api/user/profile');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    fetchFamilies: async (hasAssociation, page, size, boothId) => {
        try {
            const response = await apiClient.get(`/votebase/v1/api/family?page=${page}&size=${size}&boothId=${boothId}&association=${hasAssociation}`);
            return response.data;
        } catch (error) {
            console.log('Error while fetching families:', error.response?.data || error.message);
            throw error;
        }
    },

    fetchAssociations: async (boothId) => {
        try {
            const response = await apiClient.get(`/votebase/v1/api/association?boothId=${boothId}`);
            return response.data;
        } catch (error) {
            console.log('Error while fetching associations:', error.response?.data || error.message);
            throw error;
        }
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
    }
};
