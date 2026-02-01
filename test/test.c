//#include <cstddef>
#include <stdio.h> 

typedef struct Node{
    int val; 
    struct Node* next; 
} Node; 

int main(void){
    Node linked_list; 
    linked_list.val = 5; 
    linked_list.next = NULL; 
    printf("%s", linked_list.next->val); 

    return 0; 
}