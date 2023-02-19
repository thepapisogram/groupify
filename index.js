// Get names or list from user separated by commas
const get_members = prompt('Enter names separated by comma (",") : ');
const members = get_members.split(',');

// Get number of members allowed to be in a group
const members_per_group = prompt('how many members should be in a group?');
const number_of_groups = Math.floor(members.length / members_per_group);
const calc_members = members_per_group * number_of_groups;

// Function to add result to html
const addToHTML = (number, list) => {
    let new_element = `
            <div>
                <h1>Group ${number}</h1>
                <ol>
                    ${list}
                </ol>
            </div>
        `;
    document.getElementById('app').innerHTML += new_element;
}

// If all groups can have same number of members then
if (calc_members == members.length) {
    for (i = 1; i <= number_of_groups; i++) {
        let max_members_to_add = members_per_group;
        let cur_list_html = ``;
        for (n = 0; n < max_members_to_add; n++) {
            let random_name = members[Math.floor(Math.random() * members.length)];
            cur_list_html += `<li>${random_name}</li>`;
            let index_of_random = members.indexOf(random_name);
            if (index_of_random > -1) {
                members.splice(index_of_random, 1);
            }
        }
        addToHTML(i, cur_list_html);
    }
}/* If groups cannot have same number of members */ else {
    for (i = 1; i <= number_of_groups + 1; i++) {
        let max_members_to_add = members_per_group;
        let cur_list_html = ``;
        for (n = 0; n < max_members_to_add; n++) {
            if(i == number_of_groups + 1){
                if(members.length == 0){
                    break;
                }
            }
            let random_name = members[Math.floor(Math.random() * members.length)];
            cur_list_html += `<li>${random_name}</li>`;
            let index_of_random = members.indexOf(random_name);
            if (index_of_random > -1) {
                members.splice(index_of_random, 1);
            }
        }
        addToHTML(i, cur_list_html);
    }
}