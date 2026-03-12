import apiClient from './ApiClient';

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
            const response = await apiClient.get('/votebase/v1/api/voters/snapshot?assemblyCode=000000000175');
            return response.data;
        } catch (error) {
            console.log('Load data API Error:', error.response?.data || error.message);
            throw error;
        }
    },

    loadDataLite: async () => {
        try {
            const response = await apiClient.get('/votebase/v1/api/voters/snapshot?assemblyCode=000000000175&includeVoters=false');
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

    getVolunteerList: async (role, page, size, search, blocked, sortBy, direction, assignmentType) => {
        try {
            const response = await apiClient.get(`/votebase/v1/api/user?role=${role}&page=${page}&size=${size}&search=${search}&blocked=${blocked}&sortBy=${sortBy}&direction=${direction}&assignmentType=${assignmentType}`);
            return response.data;
        } catch (error) {
            console.log('Error while fetching volunteer data:', error.response.data || error.message)
            throw error;
        }
    },

    addVolunteer: async (data) => {
        try {
            const response = await apiClient.post('/votebase/v1/api/user/register', data);
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
            const response = await apiClient.get('/votebase/v1/api/booth');
            return response.data;
        } catch (error) {
            console.log('Error while fetching booth ids:', error.response?.data || error.message);
            throw error;
        }
    },

    addVolunteer: async (jsonReq) => {
        try {
            const response = await apiClient.post('/votebase/v1/api/user/register', jsonReq);
            return response.data
        } catch (error) {
            console.log('Error while adding volunteer')
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
