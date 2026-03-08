import apiClient from './ApiClient';

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

    updateVoter: async (voterId, jsonReq) => {
        try {
            const response = await apiClient.put(`/votebase/v1/api/voters/${voterId}`, jsonReq);
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
