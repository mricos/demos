// TUBES.groups - Cylinder Group Management
(function(TUBES) {
    'use strict';

    let groups = [];
    let nextGroupId = 0;
    let selectedGroup = null;

    TUBES.groups = {
        get groups() { return groups; },
        set groups(val) { groups = val; },
        get nextGroupId() { return nextGroupId; },
        set nextGroupId(val) { nextGroupId = val; },
        get selectedGroup() { return selectedGroup; },

        init() {
            this.load();
            console.log('TUBES.groups: initialized');
        },

        create(name, parentGroupId = null) {
            const group = {
                id: nextGroupId++,
                name: name || `Group ${nextGroupId}`,
                cylinderIds: [],
                childGroupIds: [],
                parentGroupId: parentGroupId,
                properties: null
            };

            groups.push(group);

            if (parentGroupId !== null) {
                const parent = groups.find(g => g.id === parentGroupId);
                if (parent) {
                    parent.childGroupIds.push(group.id);
                }
            }

            this.save();
            return group;
        },

        delete(groupId) {
            const group = groups.find(g => g.id === groupId);
            if (!group) return;

            if (group.parentGroupId !== null) {
                const parent = groups.find(g => g.id === group.parentGroupId);
                if (parent) {
                    parent.childGroupIds = parent.childGroupIds.filter(id => id !== groupId);
                }
            }

            group.childGroupIds.forEach(childId => this.delete(childId));
            groups = groups.filter(g => g.id !== groupId);
            this.save();
        },

        addCylinderToGroup(cylinderId, groupId) {
            const group = groups.find(g => g.id === groupId);
            if (!group) return;

            if (!group.cylinderIds.includes(cylinderId)) {
                group.cylinderIds.push(cylinderId);

                const cylinder = TUBES.cylinder.cylinders.find(c => c.id === cylinderId);
                if (cylinder && cylinder.metadata.groupIds) {
                    if (!cylinder.metadata.groupIds.includes(groupId)) {
                        cylinder.metadata.groupIds.push(groupId);
                    }
                }

                this.save();
            }
        },

        removeCylinderFromGroup(cylinderId, groupId) {
            const group = groups.find(g => g.id === groupId);
            if (!group) return;

            group.cylinderIds = group.cylinderIds.filter(id => id !== cylinderId);

            const cylinder = TUBES.cylinder.cylinders.find(c => c.id === cylinderId);
            if (cylinder && cylinder.metadata.groupIds) {
                cylinder.metadata.groupIds = cylinder.metadata.groupIds.filter(id => id !== groupId);
            }

            this.save();
        },

        getCylinderGroups(cylinderId) {
            return groups.filter(g => g.cylinderIds.includes(cylinderId));
        },

        getGroupCylinders(groupId, recursive = false) {
            const group = groups.find(g => g.id === groupId);
            if (!group) return [];

            let cylinderIds = [...group.cylinderIds];

            if (recursive) {
                group.childGroupIds.forEach(childId => {
                    cylinderIds = cylinderIds.concat(this.getGroupCylinders(childId, true));
                });
            }

            return [...new Set(cylinderIds)];
        },

        applyPropertiesToGroup(groupId, properties, recursive = false) {
            const cylinderIds = this.getGroupCylinders(groupId, recursive);

            cylinderIds.forEach(cylinderId => {
                const cylinder = TUBES.cylinder.cylinders.find(c => c.id === cylinderId);
                if (cylinder) {
                    Object.assign(cylinder.metadata.parameters, properties);
                    TUBES.cylinder.rebuild(cylinderId);
                }
            });
        },

        rename(groupId, newName) {
            const group = groups.find(g => g.id === groupId);
            if (group) {
                group.name = newName;
                this.save();
            }
        },

        save() {
            if (TUBES.storage) {
                TUBES.storage.save();
            }
        },

        load() {
            // Groups loaded by TUBES.storage
        },

        clear() {
            groups = [];
            nextGroupId = 0;
            selectedGroup = null;
            if (TUBES.storage) {
                TUBES.storage.save();
            }
        }
    };
})(window.TUBES);
